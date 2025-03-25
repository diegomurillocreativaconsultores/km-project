import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';

const TimelineCalendar = () => {
  const [calendarData, setCalendarData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(null);
  const [years, setYears] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  
  // Get color for provider
  const getProviderColor = (provider) => {
    if (!provider) return '#999';
    
    const lowerProvider = provider.toLowerCase();
    if (lowerProvider.includes('comcast')) return '#4285F4';
    if (lowerProvider.includes('charter') || lowerProvider.includes('spectrum')) return '#EA4335';
    if (lowerProvider.includes('hypercore')) return '#673AB7';
    if (lowerProvider.includes('cox')) return '#34A853';
    if (lowerProvider.includes('ten4')) return '#FF6D01';
    return '#00ACC1';
  };
  
  // Function to get payment color based on amount
  const getPaymentColor = (amount, max) => {
    // Create color ranges: green for low, yellow for medium, red for high
    const ratio = amount / max;
    
    if (ratio < 0.3) return '#e0f2f1'; // Light green
    if (ratio < 0.6) return '#b2dfdb'; // Medium green
    if (ratio < 0.75) return '#80cbc4'; // Darker green
    if (ratio < 0.9) return '#4db6ac'; // Teal
    return '#00897b'; // Dark teal
  };
  
  // Format month name
  const formatMonth = (monthKey) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };
  
  // Draw sparkline SVG
  const renderSparkline = (data, width, height) => {
    if (!data || data.length === 0) return null;
    
    // Normalize data for sparkline
    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    
    // Calculate points
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const normalizedValue = maxValue === minValue 
        ? 0.5 
        : (value - minValue) / (maxValue - minValue);
      const y = height - (normalizedValue * height);
      return `${x},${y}`;
    }).join(' ');
    
    return (
      <svg width={width} height={height} className="sparkline">
        <polyline
          fill="none"
          stroke="#2196F3"
          strokeWidth="1.5"
          points={points}
        />
        <circle
          cx={(data.length - 1) / (data.length - 1) * width}
          cy={height - ((data[data.length - 1] - minValue) / (maxValue - minValue || 1) * height)}
          r="3"
          fill="#2196F3"
        />
      </svg>
    );
  };
  
  // Load and process CSV data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/data/Acorn Health.csv');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const fileContent = await response.text();
        
        Papa.parse(fileContent, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          complete: (results) => {
            processData(results.data);
            setLoading(false);
          },
          error: (error) => {
            console.error("Error parsing CSV:", error);
            setLoading(false);
          }
        });
      } catch (error) {
        console.error("Error reading file:", error);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Process CSV data into calendar format
  const processData = (data) => {
    // Extract agreement dates and payment information
    const agreementData = data
      .filter(row => row['Agreement Date'] && row['Recurring Monthly Charges'])
      .map(row => {
        let charges = 0;
        if (row['Recurring Monthly Charges']) {
          const chargeStr = String(row['Recurring Monthly Charges']).replace(/[$,]/g, '');
          charges = parseFloat(chargeStr);
        }
        
        return {
          agreementName: row['Agreement Name'],
          provider: row['Party1 Name'],
          date: new Date(row['Agreement Date']),
          term: row['Term'] || 36, // Default to 36 months if not specified
          monthlyCharges: isNaN(charges) ? 0 : charges
        };
      })
      .filter(item => !isNaN(item.date.getTime()) && item.monthlyCharges > 0);
    
    // Group agreements by month
    const months = {};
    
    // Collect all active months for each agreement
    agreementData.forEach(agreement => {
      const startDate = new Date(agreement.date);
      const endDate = new Date(startDate);
      endDate.setMonth(startDate.getMonth() + agreement.term);
      
      let currentDate = new Date(startDate);
      
      // For each month the agreement is active, add payment data
      while (currentDate <= endDate) {
        const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (!months[monthKey]) {
          months[monthKey] = {
            agreements: [],
            total: 0,
            startDates: [],
            endDates: [],
            providers: {}
          };
        }
        
        // Add provider data
        const providerName = agreement.provider || "Unknown";
        if (!months[monthKey].providers[providerName]) {
          months[monthKey].providers[providerName] = 0;
        }
        months[monthKey].providers[providerName] += agreement.monthlyCharges;
        
        // Track agreement in this month
        const existingAgreement = months[monthKey].agreements.find(a => a.name === agreement.agreementName);
        if (!existingAgreement) {
          months[monthKey].agreements.push({
            name: agreement.agreementName,
            provider: agreement.provider,
            amount: agreement.monthlyCharges
          });
        }
        
        // Update total payments
        months[monthKey].total += agreement.monthlyCharges;
        
        // Track start/end dates
        const isStartMonth = currentDate.getMonth() === startDate.getMonth() && 
                              currentDate.getFullYear() === startDate.getFullYear();
        const isEndMonth = currentDate.getMonth() === endDate.getMonth() && 
                            currentDate.getFullYear() === endDate.getFullYear();
        
        if (isStartMonth) {
          months[monthKey].startDates.push({
            name: agreement.agreementName,
            provider: agreement.provider,
            day: startDate.getDate(),
            amount: agreement.monthlyCharges
          });
        }
        
        if (isEndMonth) {
          months[monthKey].endDates.push({
            name: agreement.agreementName,
            provider: agreement.provider,
            day: endDate.getDate(),
            amount: agreement.monthlyCharges
          });
        }
        
        // Move to next month
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    });
    
    // Convert to array and sort by date
    const sortedMonths = Object.keys(months)
      .sort()
      .map(key => ({
        month: key,
        ...months[key]
      }));
    
    // Calculate sparkline data
    const monthsWithSparklines = sortedMonths.map((monthData, index) => {
      // Get previous 6 months of data for sparkline
      const previousMonths = sortedMonths
        .slice(Math.max(0, index - 5), index + 1)
        .map(m => m.total);
      
      return {
        ...monthData,
        sparkline: previousMonths
      };
    });
    
    // Extract unique years for filter
    const uniqueYears = [...new Set(monthsWithSparklines.map(month => month.month.split('-')[0]))];
    setYears(uniqueYears.sort());
    
    // Set default selected year to the first year
    if (uniqueYears.length > 0 && !selectedYear) {
      setSelectedYear(uniqueYears[0]);
    }
    
    setCalendarData(monthsWithSparklines);
  };
  
  // Filter data by selected year
  const filteredData = calendarData.filter(month => {
    if (!selectedYear) return true;
    return month.month.startsWith(selectedYear);
  });
  
  // Get max payment for color scaling
  const maxPayment = Math.max(...filteredData.map(month => month.total), 0);
  
  // Handle month click
  const handleMonthClick = (month) => {
    setSelectedMonth(selectedMonth === month ? null : month);
  };
  
  if (loading) {
    return <div className="loading">Loading data...</div>;
  }
  
  return (
    <div className="timeline-calendar">
      <h2>Acorn Health Payment Timeline</h2>
      
      {/* Year selector */}
      <div className="year-selector">
        <label>Select Year: </label>
        <div className="year-buttons">
          {years.map(year => (
            <button
              key={year}
              className={`year-button ${selectedYear === year ? 'active' : ''}`}
              onClick={() => setSelectedYear(year)}
            >
              {year}
            </button>
          ))}
        </div>
      </div>
      
      {/* Month grid */}
      <div className="month-grid">
        {filteredData.map(month => (
          <div 
            key={month.month}
            className={`month-card ${selectedMonth === month.month ? 'selected' : ''}`}
            style={{ 
              backgroundColor: getPaymentColor(month.total, maxPayment),
              borderColor: selectedMonth === month.month ? '#2196F3' : 'transparent'
            }}
            onClick={() => handleMonthClick(month.month)}
          >
            <div className="month-header">
              <h3>{formatMonth(month.month)}</h3>
              <div className="month-total">${month.total.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
            </div>
            
            {/* Sparkline */}
            <div className="sparkline-container">
              {renderSparkline(month.sparkline, 120, 40)}
            </div>
            
            {/* Contract Markers */}
            {(month.startDates.length > 0 || month.endDates.length > 0) && (
              <div className="contract-markers">
                {month.startDates.length > 0 && (
                  <div className="marker start-marker">
                    <span className="marker-icon">+</span>
                    <span className="marker-count">{month.startDates.length}</span>
                  </div>
                )}
                {month.endDates.length > 0 && (
                  <div className="marker end-marker">
                    <span className="marker-icon">-</span>
                    <span className="marker-count">{month.endDates.length}</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Mini provider breakdown */}
            <div className="provider-bars">
              {Object.entries(month.providers)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([provider, amount]) => (
                  <div key={provider} className="provider-bar-container">
                    <div className="provider-label">
                      <span 
                        className="provider-color" 
                        style={{ backgroundColor: getProviderColor(provider) }}
                      ></span>
                      <span className="provider-name">
                        {provider.includes('Comcast') ? 'Comcast' : 
                        provider.includes('Charter') || provider.includes('Spectrum') ? 'Charter' :
                        provider.includes('Hypercore') ? 'Hypercore' :
                        provider.includes('Cox') ? 'Cox' :
                        provider.includes('Ten4') ? 'Ten4' :
                        provider.substring(0, 10)}...
                      </span>
                    </div>
                    <div className="provider-amount">${amount.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* Selected month details */}
      {selectedMonth && (
        <div className="month-details">
          <h3>Details for {formatMonth(selectedMonth)}</h3>
          
          {/* Get the selected month data */}
          {calendarData.filter(m => m.month === selectedMonth).map(month => (
            <div key={month.month} className="detail-container">
              {/* Start/End dates section */}
              <div className="events-container">
                {month.startDates.length > 0 && (
                  <div className="event-section">
                    <h4>New Contracts ({month.startDates.length})</h4>
                    <ul className="event-list">
                      {month.startDates.map((event, idx) => (
                        <li key={`start-${idx}`} className="event-item">
                          <div className="event-marker" style={{backgroundColor: getProviderColor(event.provider)}}></div>
                          <div className="event-date">Day {event.day}</div>
                          <div className="event-details">
                            <div className="event-name">{event.name}</div>
                            <div className="event-provider">{event.provider}</div>
                            <div className="event-amount">${event.amount.toLocaleString(undefined, {maximumFractionDigits: 2})}/month</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {month.endDates.length > 0 && (
                  <div className="event-section">
                    <h4>Ending Contracts ({month.endDates.length})</h4>
                    <ul className="event-list">
                      {month.endDates.map((event, idx) => (
                        <li key={`end-${idx}`} className="event-item">
                          <div className="event-marker" style={{backgroundColor: getProviderColor(event.provider)}}></div>
                          <div className="event-date">Day {event.day}</div>
                          <div className="event-details">
                            <div className="event-name">{event.name}</div>
                            <div className="event-provider">{event.provider}</div>
                            <div className="event-amount">${event.amount.toLocaleString(undefined, {maximumFractionDigits: 2})}/month</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              {/* Active agreements */}
              <div className="agreements-section">
                <h4>Active Agreements ({month.agreements.length})</h4>
                <div className="provider-summary">
                  {Object.entries(month.providers)
                    .sort((a, b) => b[1] - a[1])
                    .map(([provider, amount]) => (
                      <div key={provider} className="provider-summary-item">
                        <div className="provider-color-block" style={{backgroundColor: getProviderColor(provider)}}></div>
                        <div className="provider-summary-name">{provider}</div>
                        <div className="provider-summary-amount">${amount.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
                        <div className="provider-summary-percent">{((amount / month.total) * 100).toFixed(1)}%</div>
                      </div>
                    ))}
                </div>
                
                <div className="agreements-list">
                  {month.agreements
                    .sort((a, b) => b.amount - a.amount)
                    .map((agreement, idx) => (
                      <div key={idx} className="agreement-item">
                        <div className="agreement-color" style={{backgroundColor: getProviderColor(agreement.provider)}}></div>
                        <div className="agreement-name">{agreement.name}</div>
                        <div className="agreement-amount">${agreement.amount.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Legend */}
      <div className="legend">
        <div className="legend-item">
          <h4>Payment Amounts</h4>
          <div className="color-scale">
            <div className="color-block" style={{backgroundColor: '#e0f2f1'}}></div>
            <div className="color-block" style={{backgroundColor: '#b2dfdb'}}></div>
            <div className="color-block" style={{backgroundColor: '#80cbc4'}}></div>
            <div className="color-block" style={{backgroundColor: '#4db6ac'}}></div>
            <div className="color-block" style={{backgroundColor: '#00897b'}}></div>
          </div>
          <div className="scale-labels">
            <span>Lower</span>
            <span>Higher</span>
          </div>
        </div>
        
        <div className="legend-item">
          <h4>Contract Events</h4>
          <div className="event-legends">
            <div className="event-legend">
              <div className="marker start-marker">
                <span className="marker-icon">+</span>
              </div>
              <span>New Contract</span>
            </div>
            <div className="event-legend">
              <div className="marker end-marker">
                <span className="marker-icon">-</span>
              </div>
              <span>Ending Contract</span>
            </div>
          </div>
        </div>
        
        <div className="legend-item">
          <h4>Sparklines</h4>
          <div className="sparkline-legend">
            <svg width="100" height="30">
              <polyline
                fill="none"
                stroke="#2196F3"
                strokeWidth="1.5"
                points="0,20 20,15 40,10 60,18 80,5 100,12"
              />
              <circle cx="100" cy="12" r="3" fill="#2196F3" />
            </svg>
            <span>6-month payment trend</span>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .timeline-calendar {
          font-family: 'Arial', sans-serif;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          color: #333;
        }
        
        h2 {
          text-align: center;
          color: #00796b;
          margin-bottom: 20px;
        }
        
        .year-selector {
          margin: 20px 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .year-buttons {
          display: flex;
          gap: 10px;
        }
        
        .year-button {
          padding: 8px 16px;
          border: 1px solid #ddd;
          background: #f5f5f5;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .year-button.active {
          background: #00796b;
          color: white;
          border-color: #00796b;
          font-weight: bold;
        }
        
        .month-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 15px;
          margin-bottom: 30px;
        }
        
        .month-card {
          border: 2px solid transparent;
          border-radius: 8px;
          padding: 15px;
          transition: all 0.3s;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .month-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        
        .month-card.selected {
          box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
          transform: translateY(-3px);
        }
        
        .month-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          border-bottom: 1px solid rgba(0,0,0,0.1);
          padding-bottom: 8px;
        }
        
        .month-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: bold;
        }
        
        .month-total {
          font-weight: bold;
          font-size: 15px;
        }
        
        .sparkline-container {
          height: 40px;
          margin: 10px 0;
          border-bottom: 1px solid rgba(0,0,0,0.1);
          padding-bottom: 8px;
        }
        
        .contract-markers {
          display: flex;
          gap: 10px;
          margin: 8px 0;
        }
        
        .marker {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: bold;
        }
        
        .start-marker {
          background-color: rgba(76, 175, 80, 0.2);
          color: #2e7d32;
        }
        
        .end-marker {
          background-color: rgba(244, 67, 54, 0.2);
          color: #c62828;
        }
        
        .marker-icon {
          font-weight: bold;
        }
        
        .provider-bars {
          margin-top: 10px;
        }
        
        .provider-bar-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 5px;
          font-size: 12px;
        }
        
        .provider-label {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        
        .provider-color {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        
        .provider-name {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100px;
        }
        
        .provider-amount {
          font-weight: bold;
        }
        
        .month-details {
          background-color: #f5f5f5;
          border-radius: 8px;
          padding: 20px;
          margin-top: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .month-details h3 {
          color: #00796b;
          margin-top: 0;
          border-bottom: 1px solid #ddd;
          padding-bottom: 10px;
        }
        
        .detail-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        
        @media (max-width: 768px) {
          .detail-container {
            grid-template-columns: 1fr;
          }
        }
        
        .events-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .event-section h4 {
          margin-top: 0;
          border-bottom: 1px solid #eee;
          padding-bottom: 5px;
        }
        
        .event-list {
          padding: 0;
          list-style-type: none;
        }
        
        .event-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 10px;
          padding: 10px;
          border-radius: 4px;
          background-color: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .event-marker {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin-top: 4px;
        }
        
        .event-date {
          font-weight: bold;
          font-size: 12px;
          padding: 2px 6px;
          background-color: #f0f0f0;
          border-radius: 4px;
          white-space: nowrap;
        }
        
        .event-details {
          flex: 1;
        }
        
        .event-name {
          font-weight: bold;
          margin-bottom: 3px;
        }
        
        .event-provider {
          font-size: 12px;
          color: #666;
          margin-bottom: 3px;
        }
        
        .event-amount {
          font-size: 13px;
          font-weight: bold;
          color: #00796b;
        }
        
        .agreements-section {
          background-color: white;
          border-radius: 6px;
          padding: 15px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .agreements-section h4 {
          margin-top: 0;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 1px solid #eee;
        }
        
        .provider-summary {
          margin-bottom: 20px;
        }
        
        .provider-summary-item {
          display: grid;
          grid-template-columns: 10px 1fr auto auto;
          gap: 10px;
          align-items: center;
          margin-bottom: 8px;
          padding: 8px;
          border-radius: 4px;
          background-color: #f9f9f9;
        }
        
        .provider-color-block {
          width: 10px;
          height: 100%;
          border-radius: 2px;
        }
        
        .provider-summary-name {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .provider-summary-amount {
          font-weight: bold;
          text-align: right;
        }
        
        .provider-summary-percent {
          min-width: 50px;
          text-align: right;
          font-size: 13px;
          font-weight: bold;
          color: #00796b;
        }
        
        .agreements-list {
          max-height: 300px;
          overflow-y: auto;
          border: 1px solid #eee;
          border-radius: 4px;
        }
        
        .agreement-item {
          display: grid;
          grid-template-columns: 5px 1fr auto;
          gap: 10px;
          align-items: center;
          padding: 8px 12px;
          border-bottom: 1px solid #eee;
        }
        
        .agreement-item:last-child {
          border-bottom: none;
        }
        
        .agreement-color {
          width: 5px;
          height: 100%;
          border-radius: 2px;
        }
        
        .agreement-name {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 13px;
        }
        
        .agreement-amount {
          font-weight: bold;
          font-size: 13px;
        }
        
        .legend {
          display: flex;
          flex-wrap: wrap;
          gap: 30px;
          margin-top: 30px;
          padding: 15px;
          background-color: #f5f5f5;
          border-radius: 8px;
        }
        
        .legend-item {
          flex: 1;
          min-width: 200px;
        }
        
        .legend-item h4 {
          margin-top: 0;
          margin-bottom: 10px;
          font-size: 14px;
          color: #555;
        }
        
        .color-scale {
          display: flex;
          height: 20px;
          margin-bottom: 5px;
        }
        
        .color-block {
          flex: 1;
        }
        
        .scale-labels {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #666;
        }
        
        .event-legends {
          display: flex;
          gap: 15px;
        }
        
        .event-legend {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
        }
        
        .sparkline-legend {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
        }
        
        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 300px;
          font-size: 18px;
          color: #555;
        }
      `}</style>
    </div>
  );
};

export default TimelineCalendar;
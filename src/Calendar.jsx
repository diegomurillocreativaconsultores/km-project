import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';

const GanttCalendarHybrid = () => {
  const [contracts, setContracts] = useState([]);
  const [quarters, setQuarters] = useState([]);
  const [monthlyTotals, setMonthlyTotals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProviders, setSelectedProviders] = useState([]);
  const [providers, setProviders] = useState([]);
  const [viewMode, setViewMode] = useState('quarters'); // quarters or months
  const [hoveredContract, setHoveredContract] = useState(null);
  const [hoveredMonth, setHoveredMonth] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [timelineWidth, setTimelineWidth] = useState(0);
  const [maxPayment, setMaxPayment] = useState(0);
  const timelineRef = useRef(null);
  
  // Get color for provider
  const getProviderColor = (provider) => {
    if (!provider) return '#999';
    
    const colors = {
      'Comcast': '#4285F4',      // Blue
      'Charter': '#EA4335',      // Red
      'Hypercore': '#673AB7',    // Purple
      'Cox Business': '#34A853', // Green
      'Ten4': '#FF6D01',         // Orange
      'Default': '#00ACC1'       // Cyan
    };
    
    return colors[provider] || colors['Default'];
  };
  
  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  // Calculate position on timeline for a date
  const getPositionForDate = (date) => {
    if (!quarters || quarters.length === 0) return 0;
    
    const minDate = quarters[0].startDate;
    const maxDate = quarters[quarters.length - 1].endDate;
    const totalTimespan = maxDate.getTime() - minDate.getTime();
    
    const position = ((date.getTime() - minDate.getTime()) / totalTimespan) * timelineWidth;
    return Math.max(0, Math.min(position, timelineWidth)); // Ensure within bounds
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
  
  // Update timeline width on window resize
  useEffect(() => {
    const updateTimelineWidth = () => {
      if (timelineRef.current) {
        setTimelineWidth(timelineRef.current.clientWidth);
      }
    };
    
    // Initial update
    updateTimelineWidth();
    
    // Add event listener for window resize
    window.addEventListener('resize', updateTimelineWidth);
    
    // Clean up event listener
    return () => window.removeEventListener('resize', updateTimelineWidth);
  }, [timelineRef.current]);
  
  // Process CSV data
  const processData = (data) => {
    // Extract contract data with durations and payments
    let contractsData = data
      .filter(row => row['Agreement Date'] && row['Recurring Monthly Charges'])
      .map(row => {
        // Parse agreement date
        const startDate = new Date(row['Agreement Date']);
        if (isNaN(startDate.getTime())) return null;
        
        // Parse term (in months) - default to 36 if not specified
        const termMonths = row['Term'] || 36;
        
        // Calculate end date
        const endDate = new Date(startDate);
        endDate.setMonth(startDate.getMonth() + termMonths);
        
        // Parse monthly charge
        let monthlyCharge = 0;
        if (row['Recurring Monthly Charges']) {
          const chargeStr = String(row['Recurring Monthly Charges']).replace(/[$,]/g, '');
          monthlyCharge = parseFloat(chargeStr);
          if (isNaN(monthlyCharge)) monthlyCharge = 0;
        }
        
        // Standardize provider name
        let provider = row['Party1 Name'] || '';
        if (provider.toLowerCase().includes('comcast')) provider = 'Comcast';
        else if (provider.toLowerCase().includes('charter') || provider.toLowerCase().includes('spectrum')) provider = 'Charter';
        else if (provider.toLowerCase().includes('hypercore')) provider = 'Hypercore';
        else if (provider.toLowerCase().includes('cox')) provider = 'Cox Business';
        else if (provider.toLowerCase().includes('ten4')) provider = 'Ten4';
        
        return {
          id: row['Agreement Name'] + '-' + startDate.toISOString(),
          name: row['Agreement Name'],
          provider: provider,
          startDate: startDate,
          endDate: endDate,
          term: termMonths,
          monthlyCharge: monthlyCharge,
          totalValue: monthlyCharge * termMonths,
          sourceFile: row['source_filename']
        };
      })
      .filter(c => c !== null && c.monthlyCharge > 0);
      
    // Remove duplicate contracts
    // Group contracts by normalized name to find potential duplicates
    const contractGroups = _.groupBy(contractsData, contract => 
      contract.name.toLowerCase().replace(/\s+/g, ' ').trim()
    );
    
    // For each group, keep only unique contracts
    const deduplicated = [];
    Object.values(contractGroups).forEach(group => {
      if (group.length === 1) {
        // If only one contract with this name, keep it
        deduplicated.push(group[0]);
      } else {
        // If multiple contracts with same name, check if they're actually duplicates
        const uniqueContracts = [];
        const seen = new Set();
        
        group.forEach(contract => {
          // Create a signature based on key attributes
          const signature = `${contract.provider}-${contract.startDate.toISOString().split('T')[0]}-${contract.monthlyCharge.toFixed(2)}`;
          
          if (!seen.has(signature)) {
            seen.add(signature);
            uniqueContracts.push(contract);
          }
        });
        
        deduplicated.push(...uniqueContracts);
      }
    });
    
    // Use the deduplicated contracts
    contractsData = deduplicated;
    
    // Get unique providers
    const uniqueProviders = [...new Set(contractsData.map(c => c.provider))].filter(p => p);
    setProviders(uniqueProviders);
    setSelectedProviders(uniqueProviders); // Select all by default
    
    // Get date range for the timeline
    let minDate = new Date();
    let maxDate = new Date(2000, 0, 1);
    
    contractsData.forEach(contract => {
      if (contract.startDate < minDate) minDate = contract.startDate;
      if (contract.endDate > maxDate) maxDate = contract.endDate;
    });
    
    // Round to the nearest year for clean display
    minDate = new Date(minDate.getFullYear(), 0, 1);
    maxDate = new Date(maxDate.getFullYear() + 1, 0, 0);
    
    // Create quarters for the timeline
    const quartersData = [];
    let currentDate = new Date(minDate);
    
    while (currentDate <= maxDate) {
      const year = currentDate.getFullYear();
      for (let quarter = 1; quarter <= 4; quarter++) {
        const startMonth = (quarter - 1) * 3;
        const endMonth = quarter * 3 - 1;
        const quarterStartDate = new Date(year, startMonth, 1);
        const quarterEndDate = new Date(year, endMonth + 1, 0); // Last day of end month
        
        // Only add if within our range
        if (quarterStartDate >= minDate && quarterStartDate <= maxDate) {
          quartersData.push({
            id: `Q${quarter}-${year}`,
            name: `Q${quarter} ${year}`,
            startDate: quarterStartDate,
            endDate: quarterEndDate
          });
        }
      }
      currentDate.setFullYear(currentDate.getFullYear() + 1);
    }
    
    // Calculate monthly totals for the top chart line
    const monthlyData = {};
    
    contractsData.forEach(contract => {
      let currentMonth = new Date(contract.startDate.getFullYear(), contract.startDate.getMonth(), 1);
      const lastMonth = new Date(contract.endDate.getFullYear(), contract.endDate.getMonth(), 1);
      
      while (currentMonth <= lastMonth) {
        const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            date: new Date(currentMonth),
            total: 0,
            providers: {}
          };
        }
        
        monthlyData[monthKey].total += contract.monthlyCharge;
        
        // Track by provider
        if (!monthlyData[monthKey].providers[contract.provider]) {
          monthlyData[monthKey].providers[contract.provider] = 0;
        }
        monthlyData[monthKey].providers[contract.provider] += contract.monthlyCharge;
        
        // Move to next month
        currentMonth.setMonth(currentMonth.getMonth() + 1);
      }
    });
    
    // Convert to array and sort
    const sortedMonthlyTotals = Object.keys(monthlyData)
      .sort()
      .map(key => ({
        month: key,
        ...monthlyData[key]
      }));
    
    // Find max payment for scaling
    const maxPaymentValue = Math.max(...sortedMonthlyTotals.map(m => m.total));
    
    // Sort contracts by start date
    const sortedContracts = _.sortBy(contractsData, [
      c => c.startDate.getTime(),
      c => -c.monthlyCharge // Secondary sort by payment amount (descending)
    ]);
    
    setContracts(sortedContracts);
    setQuarters(quartersData);
    setMonthlyTotals(sortedMonthlyTotals);
    setMaxPayment(maxPaymentValue);
  };
  
  // Toggle provider selection
  const toggleProvider = (provider) => {
    if (selectedProviders.includes(provider)) {
      setSelectedProviders(selectedProviders.filter(p => p !== provider));
    } else {
      setSelectedProviders([...selectedProviders, provider]);
    }
  };
  
  // Handle contract hover
  const handleContractHover = (e, contract) => {
    setHoveredContract(contract);
    setTooltipPosition({
      x: e.clientX,
      y: e.clientY
    });
  };
  
  // Handle month hover on the total line
  const handleMonthHover = (e, month) => {
    setHoveredMonth(month);
    setTooltipPosition({
      x: e.clientX,
      y: e.clientY
    });
  };
  
  // Filter contracts by selected providers
  const filteredContracts = contracts.filter(contract => 
    selectedProviders.includes(contract.provider)
  );
  
  // Calculate bar height based on payment amount
  const getBarHeight = (monthlyCharge) => {
    const minHeight = 10; // Minimum bar height in pixels
    const maxHeight = 30; // Maximum bar height in pixels
    
    if (maxPayment === 0) return minHeight;
    
    const normalizedHeight = (monthlyCharge / maxPayment) * (maxHeight - minHeight) + minHeight;
    return Math.min(normalizedHeight, maxHeight);
  };
  
  if (loading) {
    return <div className="loading">Loading contract data...</div>;
  }
  
  return (
    <div className="gantt-calendar">
      <h2>Acorn Health Contract Payment Timeline</h2>
      <div className="chart-info">Showing {filteredContracts.length} unique contracts (duplicates removed)</div>
      
      {/* Controls */}
      <div className="controls">
        <div className="view-controls">
          <button 
            className={`view-button ${viewMode === 'quarters' ? 'active' : ''}`}
            onClick={() => setViewMode('quarters')}
          >
            Quarterly View
          </button>
          <button 
            className={`view-button ${viewMode === 'months' ? 'active' : ''}`}
            onClick={() => setViewMode('months')}
          >
            Monthly View
          </button>
        </div>
        
        <div className="provider-filters">
          <span className="filter-label">Filter by Provider:</span>
          <div className="provider-buttons">
            {providers.map(provider => (
              <button
                key={provider}
                className={`provider-button ${selectedProviders.includes(provider) ? 'active' : ''}`}
                style={{
                  backgroundColor: selectedProviders.includes(provider) ? getProviderColor(provider) : '#f0f0f0',
                  color: selectedProviders.includes(provider) ? 'white' : '#333'
                }}
                onClick={() => toggleProvider(provider)}
              >
                {provider}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Timeline chart */}
      <div className="timeline-container">
        {/* Total payment line chart */}
        <div className="total-line-container">
          <h4>Monthly Payments by Provider</h4>
          <div className="total-line-chart" ref={timelineRef}>
            {/* Line chart for payments by provider and total */}
            <svg width="100%" height="100">
              {monthlyTotals.length > 0 && (
                <>
                  {/* Draw provider lines first (below the total line) */}
                  {providers
                    .filter(provider => selectedProviders.includes(provider))
                    .map(provider => {
                      const providerData = monthlyTotals.map(month => ({
                        date: month.date,
                        amount: month.providers[provider] || 0
                      }));
                      
                      return (
                        <g key={provider}>
                          {/* Draw the line for this provider */}
                          <path
                            d={`
                              M ${getPositionForDate(providerData[0].date)} ${100 - ((providerData[0].amount / maxPayment) * 80)}
                              ${providerData.map(point => {
                                const x = getPositionForDate(point.date);
                                const y = 100 - ((point.amount / maxPayment) * 80);
                                return `L ${x} ${y}`;
                              }).join(' ')}
                            `}
                            stroke={getProviderColor(provider)}
                            strokeWidth="1.5"
                            fill="none"
                            opacity="0.7"
                          />
                          
                          {/* Draw points for this provider */}
                          {providerData
                            .filter(point => point.amount > 0) // Only draw points where there's an actual payment
                            .map((point, idx) => {
                              const x = getPositionForDate(point.date);
                              const y = 100 - ((point.amount / maxPayment) * 80);
                              
                              return (
                                <circle
                                  key={`${provider}-${idx}`}
                                  cx={x}
                                  cy={y}
                                  r="3"
                                  fill={getProviderColor(provider)}
                                  opacity="0.8"
                                />
                              );
                            })}
                        </g>
                      );
                    })}
                  
                  {/* Draw area under the total line */}
                  <path
                    d={`
                      M ${getPositionForDate(monthlyTotals[0].date)} 100
                      ${monthlyTotals.map(month => {
                        const x = getPositionForDate(month.date);
                        const y = 100 - ((month.total / maxPayment) * 80);
                        return `L ${x} ${y}`;
                      }).join(' ')}
                      L ${getPositionForDate(monthlyTotals[monthlyTotals.length - 1].date)} 100
                      Z
                    `}
                    fill="rgba(33, 150, 243, 0.1)"
                  />
                  
                  {/* Draw the total line (on top) */}
                  <path
                    d={`
                      M ${getPositionForDate(monthlyTotals[0].date)} ${100 - ((monthlyTotals[0].total / maxPayment) * 80)}
                      ${monthlyTotals.map(month => {
                        const x = getPositionForDate(month.date);
                        const y = 100 - ((month.total / maxPayment) * 80);
                        return `L ${x} ${y}`;
                      }).join(' ')}
                    `}
                    stroke="#2196F3"
                    strokeWidth="2"
                    fill="none"
                  />
                  
                  {/* Draw points for total line */}
                  {monthlyTotals.map((month, index) => {
                    const x = getPositionForDate(month.date);
                    const y = 100 - ((month.total / maxPayment) * 80);
                    
                    return (
                      <g key={month.month}>
                        <circle
                          cx={x}
                          cy={y}
                          r="4"
                          fill="#2196F3"
                        />
                        
                        {/* Invisible larger circle for easier hovering */}
                        <circle
                          cx={x}
                          cy={y}
                          r="10"
                          fill="transparent"
                          onMouseEnter={(e) => handleMonthHover(e, month)}
                          onMouseLeave={() => setHoveredMonth(null)}
                        />
                      </g>
                    );
                  })}
                </>
              )}
            </svg>
            
            {/* Y-axis grid lines and labels */}
            <div className="y-axis">
              {[0, 25, 50, 75, 100].map((percent) => (
                <div 
                  key={percent} 
                  className="y-grid-line"
                  style={{ bottom: `${percent}%` }}
                >
                  <span className="y-label">
                    ${((maxPayment * percent) / 100).toLocaleString(undefined, {maximumFractionDigits: 0})}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Timeline header */}
        <div className="timeline-header" ref={timelineRef}>
          {viewMode === 'quarters' ? (
            <>
              {quarters.map(quarter => (
                <div 
                  key={quarter.id} 
                  className="timeline-header-cell"
                  style={{
                    width: `${(quarter.endDate.getTime() - quarter.startDate.getTime()) / 
                      (quarters[quarters.length - 1].endDate.getTime() - quarters[0].startDate.getTime()) * 100}%`
                  }}
                >
                  {quarter.name}
                </div>
              ))}
            </>
          ) : (
            <>
              {/* Group months by year for better display */}
              {_.chain(monthlyTotals)
                .groupBy(month => month.date.getFullYear())
                .map((months, year) => (
                  <div key={year} className="year-group">
                    <div className="year-label">{year}</div>
                    <div className="months-container">
                      {months.map(month => (
                        <div 
                          key={month.month} 
                          className="month-header-cell"
                        >
                          {month.date.toLocaleDateString('en-US', { month: 'short' })}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
                .value()}
            </>
          )}
        </div>
        
        {/* Gantt chart body */}
        <div className="gantt-body">
          {filteredContracts.map((contract, index) => {
            // Calculate position and width of the bar
            const startPosition = getPositionForDate(contract.startDate);
            const endPosition = getPositionForDate(contract.endDate);
            const width = endPosition - startPosition;
            
            // Calculate bar height based on monthly payment
            const barHeight = getBarHeight(contract.monthlyCharge);
            
            return (
              <div 
                key={contract.id}
                className="contract-bar-container"
                style={{
                  height: `${barHeight + 10}px`, // Extra space for padding
                  marginBottom: '6px'
                }}
              >
                <div
                  className="contract-bar"
                  style={{
                    left: `${startPosition}px`,
                    width: `${width}px`,
                    height: `${barHeight}px`,
                    backgroundColor: getProviderColor(contract.provider),
                    opacity: 0.8
                  }}
                  onMouseEnter={(e) => handleContractHover(e, contract)}
                  onMouseLeave={() => setHoveredContract(null)}
                >
                  <div className="contract-label">
                    {contract.name.length > 20 ? contract.name.substring(0, 20) + '...' : contract.name}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Contract tooltip */}
      {hoveredContract && (
        <div 
          className="tooltip contract-tooltip" 
          style={{
            left: `${tooltipPosition.x + 15}px`,
            top: `${tooltipPosition.y + 15}px`
          }}
        >
          <div className="tooltip-header" style={{ backgroundColor: getProviderColor(hoveredContract.provider) }}>
            {hoveredContract.provider}
          </div>
          <div className="tooltip-content">
            <h3>{hoveredContract.name}</h3>
            <div className="tooltip-detail">
              <span className="tooltip-label">Start Date:</span>
              <span className="tooltip-value">{formatDate(hoveredContract.startDate)}</span>
            </div>
            <div className="tooltip-detail">
              <span className="tooltip-label">End Date:</span>
              <span className="tooltip-value">{formatDate(hoveredContract.endDate)}</span>
            </div>
            <div className="tooltip-detail">
              <span className="tooltip-label">Duration:</span>
              <span className="tooltip-value">{hoveredContract.term} months</span>
            </div>
            <div className="tooltip-detail">
              <span className="tooltip-label">Monthly Payment:</span>
              <span className="tooltip-value">${hoveredContract.monthlyCharge.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
            </div>
            <div className="tooltip-detail">
              <span className="tooltip-label">Total Contract Value:</span>
              <span className="tooltip-value">${hoveredContract.totalValue.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
            </div>
            {hoveredContract.sourceFile && (
              <div className="tooltip-detail source-file">
                <span className="tooltip-label">Source:</span>
                <span className="tooltip-value">{hoveredContract.sourceFile.split('_')[1] || hoveredContract.sourceFile}</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Month tooltip */}
      {hoveredMonth && (
        <div 
          className="tooltip month-tooltip" 
          style={{
            left: `${tooltipPosition.x + 15}px`,
            top: `${tooltipPosition.y + 15}px`
          }}
        >
          <div className="tooltip-header" style={{ backgroundColor: '#2196F3' }}>
            {hoveredMonth.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>
          <div className="tooltip-content">
            <div className="tooltip-detail total-detail">
              <span className="tooltip-label">Total Payment:</span>
              <span className="tooltip-value">${hoveredMonth.total.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
            </div>
            
            <h4>Provider Breakdown</h4>
            {Object.entries(hoveredMonth.providers)
              .sort((a, b) => b[1] - a[1]) // Sort by amount (descending)
              .map(([provider, amount]) => (
                <div key={provider} className="provider-detail">
                  <span 
                    className="provider-color-dot" 
                    style={{ backgroundColor: getProviderColor(provider) }}
                  ></span>
                  <span className="provider-name">{provider}</span>
                  <span className="provider-amount">${amount.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                  <span className="provider-percent">({((amount / hoveredMonth.total) * 100).toFixed(1)}%)</span>
                </div>
              ))}
          </div>
        </div>
      )}
      
      {/* Legend */}
      <div className="legend">
        <div className="legend-item">
          <div className="legend-bar-container">
            <div className="legend-bar small"></div>
            <div className="legend-bar medium"></div>
            <div className="legend-bar large"></div>
          </div>
          <div className="legend-label">Bar height indicates monthly payment amount</div>
        </div>
        
        <div className="legend-item">
          <div className="lines-legend">
            <div className="line-legend">
              <div className="line-sample" style={{backgroundColor: "#2196F3"}}></div>
              <span>Total</span>
            </div>
            {providers.map(provider => (
              <div key={provider} className="line-legend">
                <div className="line-sample" style={{backgroundColor: getProviderColor(provider)}}></div>
                <span>{provider}</span>
              </div>
            ))}
          </div>
          <div className="legend-label">Lines show payment by provider and total</div>
        </div>
      </div>
      
      <style jsx>{`
        .gantt-calendar {
          font-family: Arial, sans-serif;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        
        h2 {
          text-align: center;
          color: #333;
          margin-bottom: 10px;
        }
        
        .chart-info {
          text-align: center;
          color: #666;
          font-size: 14px;
          margin-bottom: 20px;
        }
        
        .controls {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          gap: 15px;
        }
        
        .view-controls {
          display: flex;
          gap: 10px;
        }
        
        .view-button {
          padding: 8px 16px;
          background-color: #f0f0f0;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s;
        }
        
        .view-button.active {
          background-color: #2196F3;
          color: white;
          border-color: #2196F3;
        }
        
        .provider-filters {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        
        .filter-label {
          font-weight: bold;
        }
        
        .provider-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        .provider-button {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s;
        }
        
        .provider-button:hover {
          opacity: 0.9;
          transform: translateY(-2px);
        }
        
        .timeline-container {
          border: 1px solid #ddd;
          border-radius: 6px;
          background-color: white;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
          overflow-x: auto;
        }
        
        .total-line-container {
          margin-bottom: 20px;
          position: relative;
          height: 130px; /* Increased height for the payment chart */
        }
        
        .total-line-container h4 {
          margin-top: 0;
          margin-bottom: 10px;
          color: #555;
        }
        
        .total-line-chart {
          height: 100px;
          position: relative;
          margin-bottom: 20px;
        }
        
        .y-axis {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 60px;
        }
        
        .y-grid-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 1px;
          background-color: rgba(0,0,0,0.1);
        }
        
        .y-label {
          position: absolute;
          left: 0;
          transform: translateY(-50%);
          font-size: 10px;
          color: #666;
        }
        
        .timeline-header {
          display: flex;
          border-bottom: 1px solid #ddd;
          padding-bottom: 10px;
          margin-bottom: 15px;
        }
        
        .timeline-header-cell {
          text-align: center;
          font-weight: bold;
          padding: 5px;
          font-size: 12px;
          border-right: 1px dashed #eee;
        }
        
        .year-group {
          display: flex;
          flex-direction: column;
        }
        
        .year-label {
          text-align: center;
          font-weight: bold;
          padding: 5px;
          font-size: 12px;
          background-color: #f5f5f5;
          border-right: 1px solid #ddd;
        }
        
        .months-container {
          display: flex;
        }
        
        .month-header-cell {
          width: 50px;
          text-align: center;
          font-size: 10px;
          padding: 5px 0;
          border-right: 1px dashed #eee;
        }
        
        .gantt-body {
          position: relative;
          min-height: 300px;
        }
        
        .contract-bar-container {
          position: relative;
          width: 100%;
        }
        
        .contract-bar {
          position: absolute;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        
        .contract-bar:hover {
          opacity: 1 !important;
          z-index: 10;
        }
        
        .contract-label {
          font-size: 10px;
          padding: 2px 5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: white;
          text-shadow: 0 0 2px rgba(0,0,0,0.7);
        }
        
        .tooltip {
          position: fixed;
          z-index: 1000;
          background-color: white;
          border-radius: 6px;
          box-shadow: 0 3px 14px rgba(0,0,0,0.25);
          min-width: 200px;
          max-width: 300px;
          pointer-events: none;
        }
        
        .tooltip-header {
          padding: 8px 12px;
          border-top-left-radius: 6px;
          border-top-right-radius: 6px;
          color: white;
          font-weight: bold;
          font-size: 14px;
        }
        
        .tooltip-content {
          padding: 10px 12px;
        }
        
        .tooltip-content h3 {
          margin-top: 0;
          margin-bottom: 10px;
          font-size: 14px;
          color: #333;
        }
        
        .tooltip-detail {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          font-size: 12px;
        }
        
        .tooltip-label {
          color: #666;
        }
        
        .tooltip-value {
          font-weight: bold;
          color: #333;
        }
        
        .total-detail {
          margin: 5px 0 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid #eee;
          font-size: 14px;
        }
        
        .provider-detail {
          display: flex;
          align-items: center;
          margin-bottom: 5px;
          font-size: 12px;
        }
        
        .provider-color-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 5px;
        }
        
        .provider-name {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .provider-amount {
          font-weight: bold;
          margin: 0 5px;
        }
        
        .provider-percent {
          color: #666;
          font-size: 11px;
        }
        
        .source-file {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px dotted #eee;
          font-size: 11px;
        }
        
        .legend {
          display: flex;
          justify-content: center;
          gap: 30px;
          margin-top: 20px;
          padding: 15px;
          background-color: #f5f5f5;
          border-radius: 6px;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .legend-bar-container {
          display: flex;
          align-items: flex-end;
          height: 30px;
        }
        
        .legend-bar {
          width: 15px;
          background-color: #4285F4;
          border-radius: 2px;
          margin-right: 2px;
        }
        
        .legend-bar.small {
          height: 10px;
        }
        
        .legend-bar.medium {
          height: 20px;
        }
        
        .legend-bar.large {
          height: 30px;
        }
        
        .legend-line {
          width: 30px;
          height: 2px;
          background-color: #2196F3;
          position: relative;
        }
        
        .legend-line:before {
          content: '';
          position: absolute;
          top: -3px;
          right: 0;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #2196F3;
        }
        
        .lines-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 5px;
        }
        
        .line-legend {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          background-color: rgba(0,0,0,0.05);
          border-radius: 12px;
          font-size: 12px;
        }
        
        .line-sample {
          width: 20px;
          height: 3px;
          border-radius: 1px;
        }
        
        .legend-label {
          font-size: 12px;
          color: #666;
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

export default GanttCalendarHybrid;
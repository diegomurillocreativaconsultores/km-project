import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import _ from 'lodash';

const GanttTooltip = ({ item }) => {
  const objectives = JSON.parse(item.scope_objectives);
  const start = new Date(item.start_date);
  const end = new Date(item.end_date);
  const durationInDays = Math.round((end - start) / (1000 * 60 * 60 * 24));

  return (
    <div className="bg-white p-3 rounded shadow-lg border max-w-lg">
      <h3 className="font-bold mb-2">{item.scope_title}</h3>
      <div className="mb-2">
        <span className="font-semibold">Amount:</span> {item.amount}
      </div>
      <div className="mb-2">
        <span className="font-semibold">Duration:</span> {start.toLocaleDateString()} to {end.toLocaleDateString()}
        <br />
        <span className="text-sm text-gray-600">({durationInDays} days)</span>
      </div>
      <div className="mb-2">
        <span className="font-semibold">Document Type:</span> {item.doc_type}
      </div>
      <div className="mb-2 text-sm">
        <span className="font-semibold">Reference:</span> {item.filename}
      </div>
      {objectives && objectives.length > 0 && (
        <div>
          <span className="font-semibold">Deliverables:</span>
          <ul className="list-disc pl-5 mt-1 text-sm max-h-60 overflow-y-auto">
            {objectives.map((obj, idx) => (
              <li key={idx} className="mb-1">{obj}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const GanttChart = ({ data }) => {
  const [tooltipInfo, setTooltipInfo] = useState(null);

  // Calculate date range
  const startDates = data.map(d => new Date(d.start_date));
  const endDates = data.map(d => new Date(d.end_date));
  const minDate = new Date(Math.min(...startDates));
  const maxDate = new Date(Math.max(...endDates));
  const startYear = minDate.getFullYear();
  const endYear = maxDate.getFullYear();
  const years = _.range(startYear, endYear + 1);

  const getPositionStyle = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Calculate quarters considering months
    const startQuarter = Math.floor(start.getMonth() / 3);
    const endQuarter = Math.floor(end.getMonth() / 3);
    const startPosition = (start.getFullYear() - startYear) * 4 + startQuarter;
    const endPosition = (end.getFullYear() - startYear) * 4 + endQuarter;

    // Calculate total width including fractional quarters
    const totalQuarters = (years.length) * 4;
    const left = (startPosition / totalQuarters) * 100;

    // Calculate width based on actual duration
    const durationInDays = (end - start) / (1000 * 60 * 60 * 24);
    const quarterDays = 91.25; // Average days per quarter
    const widthInQuarters = durationInDays / quarterDays;
    const width = (widthInQuarters / totalQuarters) * 100;

    return {
      left: `${left}%`,
      width: `${Math.max(width, 2)}%` // Ensure minimum visibility
    };
  };

  return (
    <div className="w-full overflow-x-auto relative">
      <div className="min-w-max">
        {/* Timeline Header */}
        <div className="flex">
          {/* Task column header */}
          <div className="w-48 flex-shrink-0 p-2 font-bold border-r bg-gray-100">
            Task
          </div>

          {/* Years and quarters */}
          <div className="flex flex-grow">
            {years.map(year => (
              <div key={year} className="flex-1">
                {/* Year */}
                <div className="text-center font-bold p-2 border-b border-r">
                  {year}
                </div>
                {/* Quarters */}
                <div className="flex">
                  {['Q1', 'Q2', 'Q3', 'Q4'].map(quarter => (
                    <div key={`${year}-${quarter}`}
                      className="flex-1 text-center p-2 border-r bg-gray-50">
                      {quarter}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gantt Rows */}
        {data.map((item, index) => (
          <div key={index} className="flex border-b hover:bg-gray-50">
            {/* Task name */}
            <div className="w-48 flex-shrink-0 p-2 border-r truncate"
              title={item.scope_title}>
              {item.scope_title}
            </div>

            {/* Timeline grid */}
            <div className="flex-grow relative h-12">
              {/* Quarter grid lines */}
              <div className="flex h-full">
                {years.map(year => (
                  <div key={year} className="flex-1 flex">
                    {[0, 1, 2, 3].map(q => (
                      <div key={`${year}-q${q}`} className="flex-1 border-r"></div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Contract bar */}
              <div
                className="absolute top-2 h-8 bg-blue-500 rounded shadow-sm cursor-pointer 
                          hover:bg-blue-600 transition-colors"
                style={getPositionStyle(item.start_date, item.end_date)}
                onMouseEnter={() => setTooltipInfo(item)}
                onMouseLeave={() => setTooltipInfo(null)}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs text-white font-medium px-1 truncate">
                    ${parseFloat(item.amount.replace(/[$,]/g, '')).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Tooltip */}
        {tooltipInfo && (
          <div className="fixed z-50" style={{ top: '20%', left: '50%', transform: 'translateX(-50%)' }}>
            <GanttTooltip item={tooltipInfo} />
          </div>
        )}
      </div>
    </div>
  );
};

const ContractDashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/contract_results.json'); // Adjust the path as needed
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const jsonData = await response.json();

        // Filter out entries with missing or invalid amounts
        const validData = jsonData.filter(item => {
          const amount = parseFloat(item.amount?.replace(/[$,]/g, ''));
          return !isNaN(amount) && item.start_date && item.end_date;
        });

        // Sort by start date
        const sortedData = _.sortBy(validData, item => new Date(item.start_date));
        setData(sortedData);
        setLoading(false);
      } catch (err) {
        setError('Error loading data: ' + err.message);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const prepareFinancialData = () => {
    return data.map(item => ({
      title: item.scope_title,
      amount: parseFloat(item.amount.replace(/[$,]/g, '')),
    }));
  };

  const totalAmount = () => {
    return data.reduce((sum, item) => {
      const amount = parseFloat(item.amount.replace(/[$,]/g, ''));
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Contract Analysis Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Financial Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold mb-4">
                  Total Contract Value: ${totalAmount().toLocaleString()}
                </p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={prepareFinancialData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="title" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="amount" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contract Timeline (Gantt Chart)</CardTitle>
              </CardHeader>
              <CardContent>
                <GanttChart data={data} />
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContractDashboard;
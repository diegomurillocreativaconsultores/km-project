import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import _ from 'lodash';

// Custom tooltip components
const InvoiceTooltip = ({ invoice }) => (
  <div className="bg-white p-3 rounded shadow-lg border">
    <h3 className="font-bold mb-2">Invoice Details</h3>
    <div className="mb-1">
      <span className="font-semibold">Number:</span> {invoice.invoice_number}
    </div>
    <div className="mb-1">
      <span className="font-semibold">Amount:</span> {invoice.invoice_amount}
    </div>
    <div className="mb-1">
      <span className="font-semibold">Date:</span> {new Date(invoice.invoice_date).toLocaleDateString()}
    </div>
    <div className="mb-1">
      <span className="font-semibold">Reference:</span> {invoice.invoice_reference}
    </div>
  </div>
);

const ContractTooltip = ({ item }) => {
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
      {objectives?.length > 0 && (
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

const GanttChart = ({ data, invoices }) => {
  const [tooltipInfo, setTooltipInfo] = useState(null);
  const [invoiceTooltip, setInvoiceTooltip] = useState(null);

  // Calculate date range including both contracts and invoices
  const startDates = data.map(d => new Date(d.start_date));
  const endDates = data.map(d => new Date(d.end_date));
  const invoiceDates = invoices.map(d => new Date(d.invoice_date));
  const minDate = new Date(Math.min(...startDates, ...invoiceDates));
  const maxDate = new Date(Math.max(...endDates, ...invoiceDates));
  const startYear = minDate.getFullYear();
  const endYear = maxDate.getFullYear();
  const years = _.range(startYear, endYear + 1);

  const getPositionStyle = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDuration = maxDate - minDate;
    const left = ((start - minDate) / totalDuration) * 100;
    const width = ((end - start) / totalDuration) * 100;

    return {
      left: `${left}%`,
      width: `${Math.max(width, 0.5)}%`
    };
  };

  const getInvoicePosition = (invoiceDate) => {
    const date = new Date(invoiceDate);
    const totalDuration = maxDate - minDate;
    const left = ((date - minDate) / totalDuration) * 100;
    return `${left}%`;
  };

  return (
    <div className="w-full overflow-x-auto relative">
      <div className="min-w-max">
        {/* Timeline Header */}
        <div className="flex">
          <div className="w-48 flex-shrink-0 p-2 font-bold border-r bg-gray-100">
            Item
          </div>
          <div className="flex flex-grow">
            {years.map(year => (
              <div key={year} className="flex-1">
                <div className="text-center font-bold p-2 border-b border-r">
                  {year}
                </div>
                <div className="flex">
                  {['Q1', 'Q2', 'Q3', 'Q4'].map(quarter => (
                    <div key={`${year}-${quarter}`} className="flex-1 text-center p-2 border-r bg-gray-50">
                      {quarter}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invoices Row */}
        <div className="flex border-b bg-gray-50">
          <div className="w-48 flex-shrink-0 p-2 border-r font-semibold">
            All Invoices ({invoices.length})
          </div>
          <div className="flex-grow relative h-20">
            <div className="flex h-full">
              {years.map(year => (
                <div key={year} className="flex-1 flex">
                  {[0, 1, 2, 3].map(q => (
                    <div key={`${year}-q${q}`} className="flex-1 border-r"></div>
                  ))}
                </div>
              ))}
            </div>
            {invoices.map((invoice) => (
              <div
                key={invoice.invoice_number}
                className="absolute top-7 h-6 w-6 bg-green-500 rounded-full cursor-pointer 
                          hover:bg-green-600 transition-colors flex items-center justify-center"
                style={{
                  left: getInvoicePosition(invoice.invoice_date),
                  marginLeft: '-12px'
                }}
                onMouseEnter={() => setInvoiceTooltip(invoice)}
                onMouseLeave={() => setInvoiceTooltip(null)}
              >
                <span className="text-white text-xs font-bold">
                  ${(parseFloat(invoice.invoice_amount.replace(/[$,]/g, '')) / 1000).toFixed(0)}k
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Contract Rows */}
        {data.map((item, index) => (
          <div key={index} className="flex border-b hover:bg-gray-50">
            <div className="w-48 flex-shrink-0 p-2 border-r truncate" title={item.scope_title}>
              {item.scope_title}
            </div>
            <div className="flex-grow relative h-12">
              <div className="flex h-full">
                {years.map(year => (
                  <div key={year} className="flex-1 flex">
                    {[0, 1, 2, 3].map(q => (
                      <div key={`${year}-q${q}`} className="flex-1 border-r"></div>
                    ))}
                  </div>
                ))}
              </div>
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

        {/* Tooltips */}
        {tooltipInfo && (
          <div className="fixed z-50" style={{ top: '20%', left: '50%', transform: 'translateX(-50%)' }}>
            <ContractTooltip item={tooltipInfo} />
          </div>
        )}
        {invoiceTooltip && (
          <div className="fixed z-50" style={{ top: '20%', left: '50%', transform: 'translateX(-50%)' }}>
            <InvoiceTooltip invoice={invoiceTooltip} />
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-end gap-4 text-sm">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
          <span>Contracts</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
          <span>Invoices</span>
        </div>
      </div>
    </div>
  );
};

const ContractDashboard = () => {
  const [contractData, setContractData] = useState([]);
  const [invoiceData, setInvoiceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const contractResponse = await fetch('/contract_financial_analysis.json');
        const contractJson = await contractResponse.json();
        
        const validContracts = contractJson.filter(item => {
          const amount = parseFloat(item.amount?.replace(/[$,]/g, ''));
          return !isNaN(amount) && item.start_date && item.end_date;
        });

        const sortedContracts = _.sortBy(validContracts, item => new Date(item.start_date));
        setContractData(sortedContracts);

        const invoiceResponse = await fetch('/invoice_results.json');
        const invoiceJson = await invoiceResponse.json();
        
        const normalizedInvoices = invoiceJson.map(invoice => ({
          ...invoice,
          normalizedAmount: parseFloat(invoice.invoice_amount.replace(/[$,]/g, '')),
          date: new Date(invoice.invoice_date)
        }));

        const uniqueInvoices = _.uniqBy(normalizedInvoices, 'invoice_number');
        setInvoiceData(uniqueInvoices);
        setLoading(false);
      } catch (err) {
        setError('Error loading data: ' + err.message);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const prepareFinancialData = () => {
    const contractBars = contractData.map(item => ({
      name: item.scope_title,
      Contract: parseFloat(item.amount.replace(/[$,]/g, '')),
      Invoices: 0
    }));

    const invoiceBars = _.reduce(invoiceData, (acc, invoice) => {
      const contractRef = invoice.invoice_reference.split('#')[1];
      const relatedContract = contractData.find(c => c.filename.includes(contractRef));
      const name = relatedContract ? relatedContract.scope_title : `Invoice ${invoice.invoice_number}`;
      
      const existingBar = acc.find(bar => bar.name === name);
      if (existingBar) {
        existingBar.Invoices += invoice.normalizedAmount;
      } else {
        acc.push({
          name,
          Contract: 0,
          Invoices: invoice.normalizedAmount
        });
      }
      return acc;
    }, [...contractBars]);

    return invoiceBars;
  };

  const calculateTotals = () => {
    const contractTotal = contractData.reduce((sum, item) => {
      const amount = parseFloat(item.amount.replace(/[$,]/g, ''));
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    const invoiceTotal = invoiceData.reduce((sum, item) => 
      sum + (isNaN(item.normalizedAmount) ? 0 : item.normalizedAmount), 0);

    return { contractTotal, invoiceTotal };
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  const { contractTotal, invoiceTotal } = calculateTotals();

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
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-lg font-semibold">Total Contract Value:</p>
                    <p className="text-2xl font-bold">${contractTotal.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">Total Invoice Amount:</p>
                    <p className="text-2xl font-bold">${invoiceTotal.toLocaleString()}</p>
                  </div>
                </div>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={prepareFinancialData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Contract" fill="#3b82f6" name="Contract Value" />
                      <Bar dataKey="Invoices" fill="#22c55e" name="Invoice Amount" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contract Invoice Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <GanttChart data={contractData} invoices={invoiceData} />
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContractDashboard;
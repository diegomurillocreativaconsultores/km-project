import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import _ from 'lodash';

const ContractDashboards = () => {
  const [contractData, setContractData] = useState([]);
  const [yearlyData, setYearlyData] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [topContracts, setTopContracts] = useState([]);
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  useEffect(() => {
    const processData = () => {
      const rawData = [
        {"filename":"Contract EN578-210031 TA 001 - KMS signed.json","amount":"$115,000.00","start_date":"10/01/2020","end_date":"09/30/2021","scope_title":"License for ContractStandards Software (2020-2021)"},
        {"filename":"Contract EN578-210031 TA 003 Amd.json","amount":"$698,047.49","start_date":"10/01/2020","end_date":"09/30/2022","scope_title":"Technology professional services Services Procurement-Instruments Management"},
        {"filename":"Contract EN578-210031 TA 002 signed.json","amount":"$36,934.00","start_date":"11/30/2020","end_date":"01/22/2021","scope_title":"Simplification of Generalizable Procurement Clauses"}
      ];

      // Process the raw data
      const processed = rawData.map(contract => ({
        ...contract,
        amountValue: parseFloat(contract.amount.replace(/[$,]/g, '')),
        startDate: new Date(contract.start_date),
        endDate: new Date(contract.end_date),
        year: new Date(contract.start_date).getFullYear()
      }));

      setContractData(processed);

      // Process yearly data
      const yearly = _.chain(processed)
        .groupBy('year')
        .map((contracts, year) => ({
          year: parseInt(year),
          totalAmount: _.sumBy(contracts, 'amountValue'),
          count: contracts.length
        }))
        .sortBy('year')
        .value();

      setYearlyData(yearly);

      // Process timeline data
      const timelineData = processed.map(contract => ({
        name: `TA ${contract.filename.match(/TA\s*(\d+)/)?.[1] || 'N/A'}`,
        start: contract.startDate,
        end: contract.endDate,
        amount: contract.amountValue,
        title: contract.scope_title
      }));

      setTimeline(timelineData);

      // Process top contracts
      const sorted = _.orderBy(processed, ['amountValue'], ['desc']);
      setTopContracts(sorted.slice(0, 5));
    };

    processData();
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      maximumFractionDigits: 0
    }).format(value);
  };

  const ExecutiveSummary = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-700">Total Contract Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">
              {formatCurrency(_.sumBy(contractData, 'amountValue'))}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-700">Total Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">
              {contractData.length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50">
          <CardHeader>
            <CardTitle className="text-purple-700">Average Contract Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">
              {formatCurrency(_.meanBy(contractData, 'amountValue'))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contract Value Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yearlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={formatCurrency} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="totalAmount" stroke="#8884d8" name="Total Value" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top 5 Contracts by Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topContracts.map((contract, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div className="flex-1">
                  <div className="font-medium">{contract.scope_title}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(contract.start_date).toLocaleDateString()} - 
                    {new Date(contract.end_date).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-lg font-bold">
                  {formatCurrency(contract.amountValue)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const FinancialAnalysis = () => {
    const contractsByType = _.chain(contractData)
      .groupBy(contract => {
        if (contract.scope_title.includes('License')) return 'Software Licenses';
        if (contract.scope_title.includes('Modernization')) return 'Modernization';
        if (contract.scope_title.includes('Support')) return 'Support & Maintenance';
        return 'Other Services';
      })
      .map((contracts, type) => ({
        name: type,
        value: _.sumBy(contracts, 'amountValue')
      }))
      .value();

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Contract Distribution by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={contractsByType}
                      dataKey="value"
                      nameKey="name"
                      label={(entry) => entry.name}
                    >
                      {contractsByType.map((entry, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Yearly Contract Count vs Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yearlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis yAxisId="left" tickFormatter={formatCurrency} />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip formatter={(value, name) => {
                      return name === 'totalAmount' ? formatCurrency(value) : value;
                    }} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="totalAmount" fill="#8884d8" name="Total Value" />
                    <Bar yAxisId="right" dataKey="count" fill="#82ca9d" name="Number of Contracts" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const TimelineView = () => {
    const startDate = new Date('2020-10-01');
    const endDate = new Date('2025-02-28');
    const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);

    const generateTimelineMarkers = () => {
      const markers = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const position = ((currentDate - startDate) / (1000 * 60 * 60 * 24)) / totalDays * 100;
        const isYearStart = currentDate.getMonth() === 0;
        
        markers.push({
          date: new Date(currentDate),
          position,
          isYearStart
        });
        
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
      
      return markers;
    };

    const timelineMarkers = generateTimelineMarkers();

    return (
      <Card>
        <CardHeader>
          <CardTitle>Contract Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] relative mt-8">
            <div className="absolute top-0 left-0 w-full h-full">
              {timelineMarkers.map((marker, index) => (
                <React.Fragment key={index}>
                  <div
                    className={`absolute top-0 h-full border-l ${
                      marker.isYearStart ? 'border-gray-400' : 'border-gray-200'
                    }`}
                    style={{ left: `${marker.position}%` }}
                  />
                  <div
                    className={`absolute -top-6 transform -translate-x-1/2 ${
                      marker.isYearStart ? 'font-bold' : 'text-xs text-gray-600'
                    }`}
                    style={{ left: `${marker.position}%` }}
                  >
                    {marker.isYearStart 
                      ? marker.date.getFullYear()
                      : marker.date.toLocaleString('default', { month: 'short' })
                    }
                  </div>
                </React.Fragment>
              ))}
            </div>
            
            <TooltipProvider>
              {timeline.map((item, index) => {
                const left = ((item.start - startDate) / (1000 * 60 * 60 * 24)) / totalDays * 100;
                const width = ((item.end - item.start) / (1000 * 60 * 60 * 24)) / totalDays * 100;
                
                return (
                  <UITooltip key={index}>
                    <TooltipTrigger>
                      <div
                        className="absolute h-12 rounded cursor-pointer transition-colors hover:opacity-80 z-10"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          top: `${index * 50}px`,
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      >
                        <div className="text-white text-xs p-2">
                          <div className="font-bold">{item.name}</div>
                          <div className="truncate">{formatCurrency(item.amount)}</div>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="p-2">
                        <div className="font-bold mb-1">{item.title}</div>
                        <div className="text-sm">
                          {item.start.toLocaleDateString()} - {item.end.toLocaleDateString()}
                        </div>
                        <div className="font-bold mt-1">{formatCurrency(item.amount)}</div>
                      </div>
                    </TooltipContent>
                  </UITooltip>
                );
              })}
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6">
      <Tabs defaultValue="executive" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-[400px]">
          <TabsTrigger value="executive">Executive Summary</TabsTrigger>
          <TabsTrigger value="financial">Financial Analysis</TabsTrigger>
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
        </TabsList>

        <TabsContent value="executive">
          <ExecutiveSummary />
        </TabsContent>

        <TabsContent value="financial">
          <FinancialAnalysis />
        </TabsContent>

        <TabsContent value="timeline">
          <TimelineView />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContractDashboards;
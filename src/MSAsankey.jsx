import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';
import _ from 'lodash';
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";

const ContractFlow = () => {
  const [data, setData] = useState({
    party1: [],
    classifications: [],
    party2: []
  });

  useEffect(() => {
    const processData = async () => {
      try {
        const response = await window.fs.readFile('./data/contract_analysis1.csv', { encoding: 'utf8' });
        const result = Papa.parse(response, {
          header: true,
          skipEmptyLines: true
        });

        const csvData = result.data.filter(row => 
          row['Party1 Name'] && 
          row['Agreement Classification'] && 
          row['Party2 Name']
        );

        // Calculate total counts for percentage
        const totalContracts = csvData.length;

        // Process Party 1 data
        const party1Count = _.countBy(csvData, 'Party1 Name');
        const party1Data = Object.entries(party1Count)
          .map(([name, count]) => ({
            name,
            count,
            percentage: ((count / totalContracts) * 100).toFixed(1)
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        // Process Classifications data
        const classCount = _.countBy(csvData, 'Agreement Classification');
        const classData = Object.entries(classCount)
          .map(([name, count]) => ({
            name,
            count,
            percentage: ((count / totalContracts) * 100).toFixed(1)
          }))
          .sort((a, b) => b.count - a.count);

        // Process Party 2 data
        const party2Count = _.countBy(csvData, 'Party2 Name');
        const party2Data = Object.entries(party2Count)
          .map(([name, count]) => ({
            name,
            count,
            percentage: ((count / totalContracts) * 100).toFixed(1)
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        setData({
          party1: party1Data,
          classifications: classData,
          party2: party2Data
        });
      } catch (error) {
        console.error('Error processing data:', error);
      }
    };

    processData();
  }, []);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border rounded shadow">
          <p className="font-medium">{label}</p>
          <p className="text-sm">Count: {payload[0].value}</p>
          <p className="text-sm">Percentage: {payload[0].payload.percentage}%</p>
        </div>
      );
    }
    return null;
  };

  const ChartSection = ({ title, data, color, height }) => (
    <div className="space-y-2">
      <h3 className="text-lg font-medium" aria-label={title}>{title}</h3>
      <div className={height}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 250, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              type="number"
              label={{ 
                value: 'Number of Contracts',
                position: 'bottom',
                offset: -5
              }}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={240}
              tick={{ fill: '#374151' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="count" 
              fill={color}
              label={{ 
                position: 'right',
                fill: '#374151',
                formatter: (value, entry) => `${value} (${entry.payload.percentage}%)`,
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Contract Analysis Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <ChartSection 
          title="Top 10 Party 1 Organizations" 
          data={data.party1} 
          color="#8884d8"
          height="h-96"
        />
        <ChartSection 
          title="Agreement Classifications" 
          data={data.classifications} 
          color="#82ca9d"
          height="h-48"
        />
        <ChartSection 
          title="Top 10 Party 2 Organizations" 
          data={data.party2} 
          color="#ffc658"
          height="h-96"
        />
      </CardContent>
    </Card>
  );
};

export default ContractFlow;
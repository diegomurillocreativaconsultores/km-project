import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';
import _ from 'lodash';
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";

const MSAcharts = () => {
  const [data, setData] = useState({
    party1: [],
    classifications: [],
    party2: [],
    roles: []
  });

  useEffect(() => {
    const processData = async () => {
      try {
        const response = await fetch('/data/contract_analysis.csv');
        const csvText = await response.text();
        const result = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true
        });

        const csvData = result.data.filter(row => 
          row['Party1 Name'] && 
          row['Agreement Classification'] && 
          row['Party2 Name']
        );

        // Count frequencies
        const party1Count = _.countBy(csvData, 'Party1 Name');
        const classCount = _.countBy(csvData, 'Agreement Classification');
        const party2Count = _.countBy(csvData, 'Party2 Name');

        // Count roles with proper normalization
        const roleCount = {};
        csvData.forEach(row => {
          let party1Role = (row['Party1 Role'] || '').toLowerCase().trim();
          let party2Role = (row['Party2 Role'] || '').toLowerCase().trim();
          
          // Normalize provider variations
          if (party1Role === 'service provider') party1Role = 'provider';
          if (party2Role === 'service provider') party2Role = 'provider';
          
          if (party1Role) {
            roleCount[party1Role] = (roleCount[party1Role] || 0) + 1;
          }
          if (party2Role) {
            roleCount[party2Role] = (roleCount[party2Role] || 0) + 1;
          }
        });

        const rolesData = Object.entries(roleCount)
          .map(([name, count]) => ({ 
            name: name.charAt(0).toUpperCase() + name.slice(1), 
            count 
          }))
          .sort((a, b) => b.count - a.count);

        // Convert to arrays and sort by frequency
        const party1Data = Object.entries(party1Count)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        const classData = Object.entries(classCount)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);

        const party2Data = Object.entries(party2Count)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        setData({
          party1: party1Data,
          classifications: classData,
          party2: party2Data,
          roles: rolesData
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
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Contract Analysis Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Top 10 Party 1 Organizations</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.party1}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 250, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={240} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-medium">Agreement Classifications</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.classifications}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 250, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={240} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-medium">Top 10 Party 2 Organizations</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.party2}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 250, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={240} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-medium">Party Roles Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.roles}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 250, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={240} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#ff7300" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MSAcharts;
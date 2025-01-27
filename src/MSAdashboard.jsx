import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { AlertCircle } from 'lucide-react';

// Sample data in case no files are found
const sampleData = {
  msaAnalysis: {
    metadata: {
      contractId: "SAMPLE-001",
      vendor: "Sample Vendor",
      client: "Sample Client",
      analysisDate: "2025-01-26",
      effectiveDate: "2025-01-01",
      version: "1.0"
    },
    scores: {
      overall: 7.5,
      categories: {
        term: { score: 8, weight: 0.15, details: { initialTerm: "36 months" } },
        payment: { score: 7, weight: 0.15, details: { paymentTerms: "Net-30" } },
        sla: { score: 7, weight: 0.15, details: { availability: "99.9%" } },
        risk: { score: 8, weight: 0.15, details: { liabilityCap: "12 months" } },
        operational: { score: 7, weight: 0.15, details: { support: "24/7" } },
        security: { score: 8, weight: 0.15, details: { dataProtection: "Included" } },
        administration: { score: 7, weight: 0.10, details: { notices: "30 days" } }
      }
    },
    analysis: {
      risks: {
        high: ["Sample High Risk"],
        medium: ["Sample Medium Risk"],
        low: ["Sample Low Risk"]
      },
      recommendations: {
        critical: ["Sample Critical Recommendation"],
        important: ["Sample Important Recommendation"],
        optional: ["Sample Optional Recommendation"]
      }
    }
  }
};

const MSADashboard = () => {
    const [contracts, setContracts] = useState([]);
    const [error, setError] = useState(null);
  
    useEffect(() => {
      const loadData = async () => {
        try {
          const directory = '/contracts';
          const dirContents = await window.fs.readdir(directory);
          const jsonFiles = dirContents.filter(file => file.endsWith('.json'));
          
          if (jsonFiles.length === 0) {
            console.log('No JSON files found in data directory');
            setContracts([sampleData.msaAnalysis]);
            setError('No analysis files found. Using sample data.');
            return;
          }
  
          const loadedContracts = [];
          for (const fileName of jsonFiles) {
            try {
              const response = await window.fs.readFile(`${directory}/${fileName}`, { encoding: 'utf8' });
              const data = JSON.parse(response);
              loadedContracts.push(data.msaAnalysis);
            } catch (err) {
              console.warn(`Could not load ${fileName}:`, err);
            }
          }
  
          if (loadedContracts.length === 0) {
            setContracts([sampleData.msaAnalysis]);
            setError('Could not load any valid analysis files. Using sample data.');
          } else {
            setContracts(loadedContracts);
          }
        } catch (err) {
          console.error('Error accessing data directory:', err);
          setError('Error loading contract data. Using sample data.');
          setContracts([sampleData.msaAnalysis]);
        }
      };
  
      loadData();
    }, []);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;

    return (
      <div className="bg-white p-4 border rounded shadow-lg">
        <h3 className="font-bold">{label}</h3>
        {payload.map((entry, index) => (
          <div key={index} className="mt-2">
            <p className="text-sm">{entry.name}: {entry.value}</p>
            {entry.payload.details && (
              <div className="mt-1 text-xs text-gray-600">
                {Object.entries(entry.payload.details).map(([key, value]) => (
                  <p key={key}>{key}: {value}</p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const categoryScores = contracts.map(contract => {
    const scores = contract.scores.categories;
    return {
      name: contract.metadata.vendor,
      term: scores.term.score,
      payment: scores.payment.score,
      sla: scores.sla.score,
      risk: scores.risk.score,
      operational: scores.operational.score,
      security: scores.security.score,
      administration: scores.administration.score
    };
  });

  return (
    <div className="space-y-8 p-8">
      {error && (
        <div className="p-4 bg-yellow-50 text-yellow-700 rounded flex items-center">
          <AlertCircle className="mr-2" />
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Contract Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {contracts.map(contract => (
              <div key={contract.metadata.contractId} className="p-4 border rounded">
                <h3 className="font-bold">{contract.metadata.vendor}</h3>
                <p>Client: {contract.metadata.client}</p>
                <p>Overall Score: {contract.scores.overall}/10</p>
                <p>Analysis Date: {contract.metadata.analysisDate}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Category Scores Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryScores}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 10]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="term" name="Term" fill="#3B82F6" />
                <Bar dataKey="payment" name="Payment" fill="#10B981" />
                <Bar dataKey="sla" name="SLA" fill="#6366F1" />
                <Bar dataKey="risk" name="Risk" fill="#F59E0B" />
                <Bar dataKey="operational" name="Operational" fill="#EC4899" />
                <Bar dataKey="security" name="Security" fill="#8B5CF6" />
                <Bar dataKey="administration" name="Admin" fill="#14B8A6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Risk Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {contracts.map(contract => (
              <div key={contract.metadata.contractId} className="space-y-4">
                <div className="p-4 bg-red-50 rounded">
                  <h4 className="font-bold text-red-700">High Risks</h4>
                  <ul className="list-disc list-inside">
                    {contract.analysis.risks.high.map((risk, i) => (
                      <li key={i} className="text-sm">{risk}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 bg-yellow-50 rounded">
                  <h4 className="font-bold text-yellow-700">Medium Risks</h4>
                  <ul className="list-disc list-inside">
                    {contract.analysis.risks.medium.map((risk, i) => (
                      <li key={i} className="text-sm">{risk}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 bg-green-50 rounded">
                  <h4 className="font-bold text-green-700">Critical Recommendations</h4>
                  <ul className="list-disc list-inside">
                    {contract.analysis.recommendations.critical.map((rec, i) => (
                      <li key={i} className="text-sm">{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MSADashboard;
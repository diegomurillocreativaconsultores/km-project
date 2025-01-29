import {
  Bar,
  XAxis,
  YAxis,
  Legend,
  Tooltip,
  BarChart,
  CartesianGrid,
  ResponsiveContainer
} from 'recharts';
import {
  Card,
  CardTitle,
  CardHeader,
  CardContent,
} from './components/ui/card';
import { AlertCircle } from 'lucide-react';
import { parseContractData } from './lib/utils';
import React, { useState, useEffect } from 'react';

function importAll(requireContext) {
  return requireContext.keys().map((key) => requireContext(key));
}

const MSADashboard = () => {
  const [contracts, setContracts] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const allJson = importAll(require.context('./contracts', false, /\.json$/));

      if (!allJson || allJson.length === 0) {
        setError('No JSON files found. Using sample data.');
        setContracts([]);
      } else {
        const loadedContracts = allJson.map((rawJson) => {
          return parseContractData(rawJson);
        });

        setContracts(loadedContracts);
      }
    } catch (err) {
      console.error('Error loading JSON:', err);
      setError('Error loading contract data. Using sample data.');
      setContracts([]);
    }
  }, []);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-white p-4 border rounded shadow-lg">
        <h3 className="font-bold">{label}</h3>
        {payload.map((entry, index) => (
          <div key={index} className="mt-2">
            <p className="text-sm">
              {entry.name}: {entry.value}
            </p>
            {entry.payload.details && (
              <div className="mt-1 text-xs text-gray-600">
                {Object.entries(entry.payload.details).map(([key, value]) => (
                  <p key={key}>
                    {key}: {value}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const categoryScores = (contracts || []).map((contract, i) => {
    const scores = contract.scores.categories;
    if (!scores) {
      return {};
    }

    return {
      name: `Client ${i + 1}`,
      term: scores.term.score ?? 0,
      payment: scores.payment.score ?? 0,
      sla: scores.sla.score ?? 0,
      risk: scores.risk.score ?? 0,
      operational: scores.operational.score ?? 0,
      security: scores.security.score ?? 0,
      administration: scores.administration.score ?? 0,
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
            {contracts.map((contract, i) => (
              <div key={contract.metadata.contractId} className="p-4 border rounded">
                <h3 className="font-bold">Client {i + 1}</h3>
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
            {contracts.map((contract) => (
              <div key={contract.metadata.contractId} className="space-y-4">
                <div className="p-4 bg-red-50 rounded">
                  <h4 className="font-bold text-red-700">High Risks</h4>
                  <ul className="list-disc list-inside">
                    {contract.analysis.risks.high.map((risk, i) => (
                      <li key={i} className="text-sm">
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 bg-yellow-50 rounded">
                  <h4 className="font-bold text-yellow-700">Medium Risks</h4>
                  <ul className="list-disc list-inside">
                    {contract.analysis.risks.medium.map((risk, i) => (
                      <li key={i} className="text-sm">
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 bg-green-50 rounded">
                  <h4 className="font-bold text-green-700">Critical Recommendations</h4>
                  <ul className="list-disc list-inside">
                    {contract.analysis.recommendations.critical.map((rec, i) => (
                      <li key={i} className="text-sm">
                        {rec}
                      </li>
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
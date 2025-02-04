import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';

const MSAsankey = () => {
  const [sankeyData, setSankeyData] = useState(null);

  useEffect(() => {
    const processData = async () => {
      try {
        // Read and parse CSV file
        //const response = await window.fs.readFile('/data/contract_analysis1.csv', { encoding: 'utf8' });
        const response = await fetch('/data/contract_analysis1.csv');
        const result = Papa.parse(response, {
          header: true,
          skipEmptyLines: true
        });

        // Provider keywords for classification
        const providerKeywords = [
          'Communications', 'Cable', 'Telecom', 'Network', 'Technologies',
          'Digital', 'AT&T', 'Verizon', 'CenturyLink', 'NITEL',
          'RingCentral', 'Lumen', 'MetroNet', 'GTT', 'Equinix'
        ];

        // Function to identify providers
        const isProvider = (name) =>
          name && providerKeywords.some(keyword => name.includes(keyword));

        // Process data to count frequencies and relationships
        const providers = {};
        const customers = {};
        const agreementTypes = {};
        const connections = {
          providerToAgreement: {},
          agreementToCustomer: {}
        };

        result.data.forEach(row => {
          const party1 = row['Party1 Name'];
          const party2 = row['Party2 Name'];
          const agreementType = row['Agreement Classification'];

          if (!party1 || !party2 || !agreementType) return;

          // Categorize and count entities
          if (isProvider(party1)) {
            providers[party1] = (providers[party1] || 0) + 1;
            if (!isProvider(party2)) {
              customers[party2] = (customers[party2] || 0) + 1;
              
              // Count connections
              const provKey = `${party1}-${agreementType}`;
              const custKey = `${agreementType}-${party2}`;
              connections.providerToAgreement[provKey] = (connections.providerToAgreement[provKey] || 0) + 1;
              connections.agreementToCustomer[custKey] = (connections.agreementToCustomer[custKey] || 0) + 1;
            }
          }

          agreementTypes[agreementType] = (agreementTypes[agreementType] || 0) + 1;
        });

        // Sort and limit entities
        const topProviders = Object.entries(providers)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8);

        const topCustomers = Object.entries(customers)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8);

        const sortedAgreements = Object.entries(agreementTypes)
          .sort((a, b) => b[1] - a[1]);

        setSankeyData({
          providers: topProviders,
          agreements: sortedAgreements,
          customers: topCustomers,
          connections
        });

      } catch (error) {
        console.error('Error processing data:', error);
      }
    };

    processData();
  }, []);

  if (!sankeyData) {
    return <div className="p-4">Loading...</div>;
  }

  const calculateTotalWidth = 1200;
  const calculateTotalHeight = 800;
  const nodeWidth = 200;
  const nodeHeight = 40;
  const nodeSpacing = 10;

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <svg 
          viewBox={`0 0 ${calculateTotalWidth} ${calculateTotalHeight}`}
          className="w-full h-auto min-w-[1000px]"
        >
          <defs>
            <linearGradient id="link-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4299e1" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#48bb78" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="link-gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#48bb78" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ed8936" stopOpacity="0.6" />
            </linearGradient>
          </defs>

          {/* Column Headers */}
          <text x={125} y={25} textAnchor="middle" fontSize={14} fontWeight="bold">
            Service Providers
          </text>
          <text x={600} y={25} textAnchor="middle" fontSize={14} fontWeight="bold">
            Agreement Types
          </text>
          <text x={1050} y={25} textAnchor="middle" fontSize={14} fontWeight="bold">
            Customers
          </text>

          {/* Provider Nodes */}
          <g className="nodes providers">
            {sankeyData.providers.map(([name, count], index) => (
              <g key={`provider-${index}`}>
                <rect
                  x={50}
                  y={50 + index * (nodeHeight + nodeSpacing)}
                  width={nodeWidth}
                  height={nodeHeight}
                  fill="#4299e1"
                  className="transition-opacity hover:opacity-80"
                />
                <text
                  x={60}
                  y={75 + index * (nodeHeight + nodeSpacing)}
                  fill="white"
                  fontSize={12}
                >
                  {`${name.length > 30 ? name.substring(0, 27) + '...' : name} (${count})`}
                </text>
              </g>
            ))}
          </g>

          {/* Agreement Nodes */}
          <g className="nodes agreements">
            {sankeyData.agreements.map(([name, count], index) => (
              <g key={`agreement-${index}`}>
                <rect
                  x={500}
                  y={50 + index * (nodeHeight + nodeSpacing)}
                  width={nodeWidth}
                  height={nodeHeight}
                  fill="#48bb78"
                  className="transition-opacity hover:opacity-80"
                />
                <text
                  x={510}
                  y={75 + index * (nodeHeight + nodeSpacing)}
                  fill="white"
                  fontSize={12}
                >
                  {`${name} (${count})`}
                </text>
              </g>
            ))}
          </g>

          {/* Customer Nodes */}
          <g className="nodes customers">
            {sankeyData.customers.map(([name, count], index) => (
              <g key={`customer-${index}`}>
                <rect
                  x={950}
                  y={50 + index * (nodeHeight + nodeSpacing)}
                  width={nodeWidth}
                  height={nodeHeight}
                  fill="#ed8936"
                  className="transition-opacity hover:opacity-80"
                />
                <text
                  x={960}
                  y={75 + index * (nodeHeight + nodeSpacing)}
                  fill="white"
                  fontSize={12}
                >
                  {`${name.length > 30 ? name.substring(0, 27) + '...' : name} (${count})`}
                </text>
              </g>
            ))}
          </g>

          {/* Connection Paths */}
          <g className="links">
            {sankeyData.providers.map(([providerName], providerIndex) =>
              sankeyData.agreements.map(([agreementType], agreementIndex) => {
                const key = `${providerName}-${agreementType}`;
                const value = sankeyData.connections.providerToAgreement[key];
                if (!value) return null;

                return (
                  <path
                    key={`provider-agreement-${key}`}
                    d={`M ${250} ${70 + providerIndex * (nodeHeight + nodeSpacing)} 
                        C ${375} ${70 + providerIndex * (nodeHeight + nodeSpacing)}, 
                          ${375} ${70 + agreementIndex * (nodeHeight + nodeSpacing)}, 
                          ${500} ${70 + agreementIndex * (nodeHeight + nodeSpacing)}`}
                    fill="none"
                    stroke="url(#link-gradient)"
                    strokeWidth={Math.max(2, value * 2)}
                    className="transition-opacity hover:opacity-70"
                  />
                );
              })
            )}
            {sankeyData.agreements.map(([agreementType], agreementIndex) =>
              sankeyData.customers.map(([customerName], customerIndex) => {
                const key = `${agreementType}-${customerName}`;
                const value = sankeyData.connections.agreementToCustomer[key];
                if (!value) return null;

                return (
                  <path
                    key={`agreement-customer-${key}`}
                    d={`M ${700} ${70 + agreementIndex * (nodeHeight + nodeSpacing)} 
                        C ${825} ${70 + agreementIndex * (nodeHeight + nodeSpacing)}, 
                          ${825} ${70 + customerIndex * (nodeHeight + nodeSpacing)}, 
                          ${950} ${70 + customerIndex * (nodeHeight + nodeSpacing)}`}
                    fill="none"
                    stroke="url(#link-gradient2)"
                    strokeWidth={Math.max(2, value * 2)}
                    className="transition-opacity hover:opacity-70"
                  />
                );
              })
            )}
          </g>
        </svg>
      </div>
    </div>
  );
};

export default MSAsankey;
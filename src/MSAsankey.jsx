import React, { useEffect, useState, useMemo } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';

const MSAsankey = () => {
  const [sankeyData, setSankeyData] = useState(null);
  const [contractsData, setContractsData] = useState([]);
  const [error, setError] = useState(null);
  const [selectedLabels, setSelectedLabels] = useState(new Set());
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });

  // Function to normalize roles
  const normalizeRole = (role) => {
    if (!role) return '';
    role = role.toLowerCase();
    if (['service provider', 'provider'].includes(role)) {
      return 'Service Provider';
    }
    if (['customer', 'client'].includes(role)) {
      return 'Customer';
    }
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  // Function to normalize company names
  const normalizeCompanyName = (name) => {
    if (!name) return '';
    
    // Handle Ten4 variations
    if (name.includes('Distributed Computing') && name.includes('Ten4')) {
      return 'Ten4';
    }
    if (name === 'Distributed Computing, Inc.' || 
        name === 'Distributed Computing Inc' || 
        name === 'Distributed Computing, Inc. (DCi)') {
      return 'Ten4';
    }
    if (name === 'Ten4') {
      return 'Ten4';
    }

    // Handle AT&T variations
    if (name.includes('ACC Business')) {
      return 'AT&T';
    }
    
    return name;
  };

  useEffect(() => {
    const processData = async () => {
      try {
        const response = await fetch('/data/contract_analysis.csv');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        
        const result = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true
        });

        // Normalize company names and roles in the data
        const normalizedData = result.data.map(row => ({
          ...row,
          'Party1 Name': normalizeCompanyName(row['Party1 Name']),
          'Party2 Name': normalizeCompanyName(row['Party2 Name']),
          'Party1 Role': normalizeRole(row['Party1 Role']),
          'Party2 Role': normalizeRole(row['Party2 Role'])
        }));

        setContractsData(normalizedData);

        // A helper to detect if a party name suggests a Service Provider
        const providerKeywords = [
          'Communications', 'Cable', 'Telecom', 'Network', 'Technologies',
          'Digital', 'AT&T', 'Verizon', 'CenturyLink', 'NITEL',
          'RingCentral', 'Lumen', 'MetroNet', 'GTT', 'Equinix'
        ];
        const isProvider = (name) =>
          name && providerKeywords.some(keyword => name.includes(keyword));

        // Objects to tally counts and connections for the sankey chart
        const providers = {};
        const customers = {};
        const agreementTypes = {};
        const connections = {
          providerToAgreement: {},
          agreementToCustomer: {}
        };

        // Process each contract row by checking each party’s role independently.
        normalizedData.forEach(row => {
          const party1 = row['Party1 Name'];
          const party2 = row['Party2 Name'];
          const agreementType = row['Agreement Classification'];
          const party1Role = row['Party1 Role'];
          const party2Role = row['Party2 Role'];

          if (!party1 || !party2 || !agreementType) return;

          // Record counts for each party based solely on its declared role.
          if (party1Role === 'Service Provider') {
            providers[party1] = (providers[party1] || 0) + 1;
          } else if (party1Role === 'Customer') {
            customers[party1] = (customers[party1] || 0) + 1;
          } else {
            // Fall back to keyword detection if role isn’t explicit.
            if (isProvider(party1)) {
              providers[party1] = (providers[party1] || 0) + 1;
            } else {
              customers[party1] = (customers[party1] || 0) + 1;
            }
          }
          if (party2Role === 'Service Provider') {
            providers[party2] = (providers[party2] || 0) + 1;
          } else if (party2Role === 'Customer') {
            customers[party2] = (customers[party2] || 0) + 1;
          } else {
            if (isProvider(party2)) {
              providers[party2] = (providers[party2] || 0) + 1;
            } else {
              customers[party2] = (customers[party2] || 0) + 1;
            }
          }

          // For the sankey connections, we assume each contract
          // has one Service Provider and one Customer.
          // Check each party and, if possible, create the connection.
          if (party1Role === 'Service Provider' && party2Role === 'Customer') {
            const provKey = `${party1}-${agreementType}`;
            connections.providerToAgreement[provKey] = (connections.providerToAgreement[provKey] || 0) + 1;
            const custKey = `${agreementType}-${party2}`;
            connections.agreementToCustomer[custKey] = (connections.agreementToCustomer[custKey] || 0) + 1;
          } else if (party2Role === 'Service Provider' && party1Role === 'Customer') {
            const provKey = `${party2}-${agreementType}`;
            connections.providerToAgreement[provKey] = (connections.providerToAgreement[provKey] || 0) + 1;
            const custKey = `${agreementType}-${party1}`;
            connections.agreementToCustomer[custKey] = (connections.agreementToCustomer[custKey] || 0) + 1;
          }
          
          // Always count the agreement type regardless of role
          agreementTypes[agreementType] = (agreementTypes[agreementType] || 0) + 1;
        });

        // Select top nodes for the sankey diagram
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
        setError(error.message);
      }
    };

    processData();
  }, []);

  const toggleLabel = (category, name) => {
    const label = `${category}-${name}`;
    setSelectedLabels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(label)) {
        newSet.delete(label);
      } else {
        newSet.add(label);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      const allRows = getSelectedData().map((_, index) => index);
      setSelectedRows(new Set(allRows));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (index) => {
    const newSelectedRows = new Set(selectedRows);
    if (newSelectedRows.has(index)) {
      newSelectedRows.delete(index);
      setSelectAll(false);
    } else {
      newSelectedRows.add(index);
      if (newSelectedRows.size === getSelectedData().length) {
        setSelectAll(true);
      }
    }
    setSelectedRows(newSelectedRows);
  };

  // Updated filter logic: contracts must match ALL selected labels (logical AND)
  const getSelectedData = () => {
    if (!sankeyData || !contractsData || selectedLabels.size === 0) return [];

    // Convert selectedLabels into an array of filter objects
    const filters = Array.from(selectedLabels).map(label => {
      const [category, ...nameParts] = label.split('-');
      return { category, name: nameParts.join('-') };
    });

    return contractsData
      .filter(contract =>
        filters.every(filter => {
          if (filter.category === 'provider' || filter.category === 'customer') {
            return (
              contract['Party1 Name'] === filter.name ||
              contract['Party2 Name'] === filter.name
            );
          } else if (filter.category === 'agreement') {
            return contract['Agreement Classification'] === filter.name;
          }
          return false;
        })
      )
      .map(contract => {
        // When only one filter is active, use its type and name.
        // When multiple filters are active, display combined values.
        let type, name;
        if (filters.length === 1) {
          const filter = filters[0];
          type =
            filter.category === 'provider'
              ? 'Service Provider'
              : filter.category === 'agreement'
              ? 'Agreement Type'
              : 'Customer';
          name = filter.name;
        } else {
          type = filters.map(f => f.category).join(', ');
          name = filters.map(f => f.name).join(', ');
        }
        return {
          type,
          name,
          contractName: contract['Agreement Name'],
          party1: contract['Party1 Name'],
          party1Role: normalizeRole(contract['Party1 Role']),
          party2: contract['Party2 Name'],
          party2Role: normalizeRole(contract['Party2 Role']),
          classification: contract['Agreement Classification'],
          fileName: contract['source_filename'] // using the CSV field "source_filename"
        };
      });
  };

  // Sorting functionality for the table below the Sankey chart
  const selectedData = getSelectedData();
  const sortedData = useMemo(() => {
    if (sortConfig.key) {
      return [...selectedData].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return selectedData;
  }, [selectedData, sortConfig]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  if (error) return <div className="p-4 text-red-600">Error loading data: {error}</div>;
  if (!sankeyData) return <div className="p-4">Loading...</div>;

  const width = 1200;
  const height = 500;
  const nodeWidth = 200;
  const nodeHeight = 40;
  const nodeSpacing = 10;

  return (
    <div className="w-full space-y-8">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[1000px]">
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

          <text x={125} y={25} textAnchor="middle" fontSize={14} fontWeight="bold">
            Service Providers
          </text>
          <text x={600} y={25} textAnchor="middle" fontSize={14} fontWeight="bold">
            Agreement Types
          </text>
          <text x={1050} y={25} textAnchor="middle" fontSize={14} fontWeight="bold">
            Customers
          </text>

          <g className="nodes providers">
            {sankeyData.providers.map(([name, count], index) => {
              const isSelected = selectedLabels.has(`provider-${name}`);
              return (
                <g 
                  key={`provider-${index}`}
                  onClick={() => toggleLabel('provider', name)}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x={50}
                    y={50 + index * (nodeHeight + nodeSpacing)}
                    width={nodeWidth}
                    height={nodeHeight}
                    fill={isSelected ? '#2c5282' : '#4299e1'}
                    className="transition-all hover:opacity-80"
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
              );
            })}
          </g>

          <g className="nodes agreements">
            {sankeyData.agreements.map(([name, count], index) => {
              const isSelected = selectedLabels.has(`agreement-${name}`);
              return (
                <g 
                  key={`agreement-${index}`}
                  onClick={() => toggleLabel('agreement', name)}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x={500}
                    y={50 + index * (nodeHeight + nodeSpacing)}
                    width={nodeWidth}
                    height={nodeHeight}
                    fill={isSelected ? '#276749' : '#48bb78'}
                    className="transition-all hover:opacity-80"
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
              );
            })}
          </g>

          <g className="nodes customers">
            {sankeyData.customers.map(([name, count], index) => {
              const isSelected = selectedLabels.has(`customer-${name}`);
              return (
                <g 
                  key={`customer-${index}`}
                  onClick={() => toggleLabel('customer', name)}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x={950}
                    y={50 + index * (nodeHeight + nodeSpacing)}
                    width={nodeWidth}
                    height={nodeHeight}
                    fill={isSelected ? '#9c4221' : '#ed8936'}
                    className="transition-all hover:opacity-80"
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
              );
            })}
          </g>

          <g className="links">
            {/* Provider to Agreement connections */}
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
            
            {/* Agreement to Customer connections */}
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

      <div className="w-full overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </th>
              <th 
                onClick={() => handleSort('type')}
                className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
              >
                <div className="flex items-center">
                  Type
                  {sortConfig.key === 'type' ? (
                    sortConfig.direction === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                  ) : (
                    <FaSort className="ml-1" />
                  )}
                </div>
              </th>
              <th 
                onClick={() => handleSort('name')}
                className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
              >
                <div className="flex items-center">
                  Name
                  {sortConfig.key === 'name' ? (
                    sortConfig.direction === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                  ) : (
                    <FaSort className="ml-1" />
                  )}
                </div>
              </th>
              <th 
                onClick={() => handleSort('contractName')}
                className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
              >
                <div className="flex items-center">
                  Contract Name
                  {sortConfig.key === 'contractName' ? (
                    sortConfig.direction === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                  ) : (
                    <FaSort className="ml-1" />
                  )}
                </div>
              </th>
              <th 
                onClick={() => handleSort('party1')}
                className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
              >
                <div className="flex items-center">
                  Party 1
                  {sortConfig.key === 'party1' ? (
                    sortConfig.direction === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                  ) : (
                    <FaSort className="ml-1" />
                  )}
                </div>
              </th>
              <th 
                onClick={() => handleSort('party1Role')}
                className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
              >
                <div className="flex items-center">
                  Party 1 Role
                  {sortConfig.key === 'party1Role' ? (
                    sortConfig.direction === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                  ) : (
                    <FaSort className="ml-1" />
                  )}
                </div>
              </th>
              <th 
                onClick={() => handleSort('party2')}
                className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
              >
                <div className="flex items-center">
                  Party 2
                  {sortConfig.key === 'party2' ? (
                    sortConfig.direction === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                  ) : (
                    <FaSort className="ml-1" />
                  )}
                </div>
              </th>
              <th 
                onClick={() => handleSort('party2Role')}
                className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
              >
                <div className="flex items-center">
                  Party 2 Role
                  {sortConfig.key === 'party2Role' ? (
                    sortConfig.direction === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                  ) : (
                    <FaSort className="ml-1" />
                  )}
                </div>
              </th>
              <th 
                onClick={() => handleSort('classification')}
                className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
              >
                <div className="flex items-center">
                  Classification
                  {sortConfig.key === 'classification' ? (
                    sortConfig.direction === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                  ) : (
                    <FaSort className="ml-1" />
                  )}
                </div>
              </th>
              <th 
                onClick={() => handleSort('fileName')}
                className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
              >
                <div className="flex items-center">
                  File Name
                  {sortConfig.key === 'fileName' ? (
                    sortConfig.direction === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                  ) : (
                    <FaSort className="ml-1" />
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((item, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(index)}
                    onChange={() => handleSelectRow(index)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.type}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.contractName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.party1}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.party1Role}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.party2}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.party2Role}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.classification}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.fileName}</td>
              </tr>
            ))}
            {selectedLabels.size === 0 && (
              <tr>
                <td colSpan={10} className="px-6 py-4 text-sm text-gray-500 text-center">
                  Click on labels in the chart above to view details
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MSAsankey;
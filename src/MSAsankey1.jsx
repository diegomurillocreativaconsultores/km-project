import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';
import Papa from 'papaparse';
import _ from 'lodash';


const ContractAnalysisDashboard = () => {
  const [data, setData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [commonClauses, setCommonClauses] = useState([]);
  const [topDocuments, setTopDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Function to load and process the CSV data
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Read the CSV file - using the latest file
        const response = await fetch('/data/contract_legal_analysis.csv');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        
        // Parse the CSV data
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              processData(results.data);
              setLoading(false);
            } else {
              setError('No data found in CSV file');
              setLoading(false);
            }
          },
          error: (error) => {
            console.error('Error parsing CSV:', error);
            setError('Failed to parse CSV data: ' + error.message);
            setLoading(false);
          }
        });
        
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load data: ' + error.message);
        setLoading(false);
      }
    };
    
    // Function to normalize party names based on first word
    const getNormalizedName = (name) => {
      if (!name) return '';
      
      // Handle special cases like names with d/b/a
      if (name.includes('d/b/a')) {
        return name.split('d/b/a')[0].trim();
      }
      
      // Extract first word, handling corporate suffixes
      const words = name.split(' ');
      return words[0];
    };
    
    // Function to normalize agreement classifications
    const getNormalizedAgreementType = (type) => {
      if (!type) return '';
      
      // Extract the first word as the normalized type
      const words = type.split(' ');
      return words[0];
    };
  
    // Process the parsed data
    const processData = (rawData) => {
      // Handle empty data case
      if (!rawData || rawData.length === 0) {
        setError('No data found in the CSV file');
        return;
      }
      
      // Check if required columns exist
      const requiredColumns = ['Party 1 Name', 'Party 1 Role', 'Party 2 Name', 'Party 2 Role', 'Agreement Classification'];
      const missingColumns = requiredColumns.filter(col => !rawData[0].hasOwnProperty(col));
      
      if (missingColumns.length > 0) {
        setError(`Missing required columns: ${missingColumns.join(', ')}`);
        return;
      }
      
      // Process document information for finding top documents
      const documentData = [];
      
      try {
        rawData.forEach(row => {
          try {
            // Extract document info
            const docInfo = {
              source_filename: row['source_filename'] || row['Source File Name'] || 'Unknown',
              agreementTitle: row['Agreement Title'] || 'Unknown',
              agreementType: row['Agreement Classification'] || 'Unknown',
              normalizedAgreementType: getNormalizedAgreementType(row['Agreement Classification'] || ''),
              party1: {
                name: row['Party 1 Name'] || 'Unknown',
                role: row['Party 1 Role'] || 'Unknown',
                normalized: getNormalizedName(row['Party 1 Name'] || '')
              },
              party2: {
                name: row['Party 2 Name'] || 'Unknown',
                role: row['Party 2 Role'] || 'Unknown',
                normalized: getNormalizedName(row['Party 2 Name'] || '')
              },
              clauseCount: 0,
              clauses: []
            };
            
            // Determine provider and customer
            docInfo.provider = docInfo.party1.role?.toLowerCase().includes('provider') ? 
              docInfo.party1.normalized : 
              (docInfo.party2.role?.toLowerCase().includes('provider') ? 
                docInfo.party2.normalized : null);
                
            docInfo.customer = docInfo.party1.role?.toLowerCase().includes('customer') ? 
              docInfo.party1.normalized : 
              (docInfo.party2.role?.toLowerCase().includes('customer') ? 
                docInfo.party2.normalized : null);
            
            // Parse clauses
            const clausesStr = row['Clause Captions'] || '';
            if (clausesStr) {
              let clauses = [];
              
              if (clausesStr.startsWith('[')) {
                try {
                  clauses = JSON.parse(clausesStr.replace(/'/g, '"'));
                } catch (e) {
                  clauses = clausesStr.replace(/[\[\]']/g, '').split(',').map(c => c.trim());
                }
              } else {
                clauses = clausesStr.split(',').map(c => c.trim());
              }
              
              // Clean up clauses and count them
              docInfo.clauses = clauses
                .map(clause => clause.replace(/[\[\]']/g, '').trim())
                .filter(clause => clause !== '');
              
              docInfo.clauseCount = docInfo.clauses.length;
            }
            
            documentData.push(docInfo);
          } catch (e) {
            console.error('Error processing document:', e);
          }
        });
      } catch (e) {
        console.error('Error processing documentData:', e);
      }
      // Create mappings to track original names
      const originalToNormalized = {};
      const normalizedToOriginals = {};
      
      // Process providers with normalization
      const providers = {};
      rawData.forEach(row => {
        const p1Role = (row['Party 1 Role'] || '').toLowerCase();
        const p2Role = (row['Party 2 Role'] || '').toLowerCase();
        
        if (p1Role.includes('provider') || p1Role.includes('vendor')) {
          const originalName = row['Party 1 Name'];
          if (originalName) {
            const normalizedName = getNormalizedName(originalName);
            
            // Track mappings
            originalToNormalized[originalName] = normalizedName;
            if (!normalizedToOriginals[normalizedName]) {
              normalizedToOriginals[normalizedName] = new Set();
            }
            normalizedToOriginals[normalizedName].add(originalName);
            
            // Count normalized name
            providers[normalizedName] = (providers[normalizedName] || 0) + 1;
          }
        } else if (p2Role.includes('provider') || p2Role.includes('vendor')) {
          const originalName = row['Party 2 Name'];
          if (originalName) {
            const normalizedName = getNormalizedName(originalName);
            
            // Track mappings
            originalToNormalized[originalName] = normalizedName;
            if (!normalizedToOriginals[normalizedName]) {
              normalizedToOriginals[normalizedName] = new Set();
            }
            normalizedToOriginals[normalizedName].add(originalName);
            
            // Count normalized name
            providers[normalizedName] = (providers[normalizedName] || 0) + 1;
          }
        }
      });
      
      // Process customers with normalization
      const customers = {};
      rawData.forEach(row => {
        const p1Role = (row['Party 1 Role'] || '').toLowerCase();
        const p2Role = (row['Party 2 Role'] || '').toLowerCase();
        
        if (p1Role.includes('customer') || p1Role.includes('client')) {
          const originalName = row['Party 1 Name'];
          if (originalName) {
            const normalizedName = getNormalizedName(originalName);
            
            // Track mappings
            originalToNormalized[originalName] = normalizedName;
            if (!normalizedToOriginals[normalizedName]) {
              normalizedToOriginals[normalizedName] = new Set();
            }
            normalizedToOriginals[normalizedName].add(originalName);
            
            // Count normalized name
            customers[normalizedName] = (customers[normalizedName] || 0) + 1;
          }
        } else if (p2Role.includes('customer') || p2Role.includes('client')) {
          const originalName = row['Party 2 Name'];
          if (originalName) {
            const normalizedName = getNormalizedName(originalName);
            
            // Track mappings
            originalToNormalized[originalName] = normalizedName;
            if (!normalizedToOriginals[normalizedName]) {
              normalizedToOriginals[normalizedName] = new Set();
            }
            normalizedToOriginals[normalizedName].add(originalName);
            
            // Count normalized name
            customers[normalizedName] = (customers[normalizedName] || 0) + 1;
          }
        }
      });
      
      // Process agreement classifications with normalization
      const agreementTypes = {};
      rawData.forEach(row => {
        const originalType = row['Agreement Classification'];
        if (originalType) {
          const normalizedType = getNormalizedAgreementType(originalType);
          
          // Track mappings
          originalToNormalized[originalType] = normalizedType;
          if (!normalizedToOriginals[normalizedType]) {
            normalizedToOriginals[normalizedType] = new Set();
          }
          normalizedToOriginals[normalizedType].add(originalType);
          
          // Count normalized type
          agreementTypes[normalizedType] = (agreementTypes[normalizedType] || 0) + 1;
        }
      });
      
      // Store original names to show in tooltips
      const getOriginalNamesText = (normalizedName) => {
        const originals = Array.from(normalizedToOriginals[normalizedName] || []);
        if (originals.length <= 1) return '';
        return `Includes: ${originals.join(', ')}`;
      };
      
      // Prepare the sorted data
      const sortedProviders = Object.entries(providers)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ 
          name, 
          count,
          tooltip: getOriginalNamesText(name)
        }));
      
      const sortedCustomers = Object.entries(customers)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ 
          name, 
          count,
          tooltip: getOriginalNamesText(name)
        }));
      
      const sortedAgreementTypes = Object.entries(agreementTypes)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ 
          name, 
          count,
          tooltip: getOriginalNamesText(name)
        }));
      
      // Create an object to map from entity name to its integer id
      const nodeMap = {};
      
      // Add all node names to the map
      let nodeId = 0;
      
      // Add providers
      sortedProviders.forEach(provider => {
        nodeMap[provider.name] = nodeId++;
      });
      
      // Add agreement types
      sortedAgreementTypes.forEach(type => {
        nodeMap[type.name] = nodeId++;
      });
      
      // Add customers
      sortedCustomers.forEach(customer => {
        nodeMap[customer.name] = nodeId++;
      });
      
      // Create nodes array
      const nodes = [
        ...sortedProviders.map(p => ({ 
          id: nodeMap[p.name], 
          name: p.name, 
          category: 'provider', 
          count: p.count,
          tooltip: p.tooltip
        })),
        ...sortedAgreementTypes.map(a => ({ 
          id: nodeMap[a.name], 
          name: a.name, 
          category: 'agreementType', 
          count: a.count,
          tooltip: a.tooltip
        })),
        ...sortedCustomers.map(c => ({ 
          id: nodeMap[c.name], 
          name: c.name, 
          category: 'customer', 
          count: c.count,
          tooltip: c.tooltip
        }))
      ];
      
      // Build links
      const links = [];
      
      rawData.forEach(row => {
        let providerName = null;
        let customerName = null;
        const originalAgreementType = row['Agreement Classification'];
        
        // If no agreement type, skip this row
        if (!originalAgreementType) return;
        
        // Normalize the names for linking
        const agreementType = getNormalizedAgreementType(originalAgreementType);
        
        // Check if this agreement type is in our node map
        if (!nodeMap.hasOwnProperty(agreementType)) return;
        
        // Determine provider and customer
        const p1Role = (row['Party 1 Role'] || '').toLowerCase();
        const p2Role = (row['Party 2 Role'] || '').toLowerCase();
        
        if (p1Role.includes('provider') || p1Role.includes('vendor')) {
          const originalName = row['Party 1 Name'];
          if (originalName) {
            providerName = getNormalizedName(originalName);
          }
        } else if (p2Role.includes('provider') || p2Role.includes('vendor')) {
          const originalName = row['Party 2 Name'];
          if (originalName) {
            providerName = getNormalizedName(originalName);
          }
        }
        
        if (p1Role.includes('customer') || p1Role.includes('client')) {
          const originalName = row['Party 1 Name'];
          if (originalName) {
            customerName = getNormalizedName(originalName);
          }
        } else if (p2Role.includes('customer') || p2Role.includes('client')) {
          const originalName = row['Party 2 Name'];
          if (originalName) {
            customerName = getNormalizedName(originalName);
          }
        }
        
        // Only create links if the source and target are in our node map
        if (providerName && nodeMap.hasOwnProperty(providerName) && agreementType) {
          links.push({
            source: nodeMap[providerName],
            target: nodeMap[agreementType],
            value: 1,
            sourceName: providerName,
            targetName: agreementType
          });
        }
        
        if (agreementType && customerName && nodeMap.hasOwnProperty(customerName)) {
          links.push({
            source: nodeMap[agreementType],
            target: nodeMap[customerName],
            value: 1,
            sourceName: agreementType,
            targetName: customerName
          });
        }
      });
      
      // Aggregate links with the same source and target
      const aggregatedLinks = {};
      links.forEach(link => {
        const key = `${link.source}-${link.target}`;
        if (aggregatedLinks[key]) {
          aggregatedLinks[key].value += link.value;
        } else {
          aggregatedLinks[key] = link;
        }
      });
      
      // Extract clauses by agreement type
      const clausesByType = {};
      
      rawData.forEach(row => {
        const originalType = row['Agreement Classification'];
        const clausesStr = row['Clause Captions'] || '';
        
        if (!originalType || !clausesStr) return;
        
        try {
          // Parse clauses from string
          let clauses = [];
          
          if (clausesStr.startsWith('[')) {
            // Try to parse as JSON array
            try {
              clauses = JSON.parse(clausesStr.replace(/'/g, '"'));
            } catch (e) {
              // Fallback to simple splitting
              clauses = clausesStr.replace(/[\[\]']/g, '').split(',').map(c => c.trim());
            }
          } else {
            clauses = clausesStr.split(',').map(c => c.trim());
          }
          
          // Get normalized type
          const normalizedType = getNormalizedAgreementType(originalType);
          
          // Initialize object for normalized type if needed
          if (!clausesByType[normalizedType]) {
            clausesByType[normalizedType] = {};
          }
          
          // Count occurrences of each clause
          clauses.forEach(clause => {
            if (clause && clause !== '') {
              const cleanClause = clause.replace(/[\[\]']/g, '').trim();
              if (cleanClause) {
                clausesByType[normalizedType][cleanClause] = 
                  (clausesByType[normalizedType][cleanClause] || 0) + 1;
              }
            }
          });
        } catch (e) {
          console.error('Error processing clauses:', e);
        }
      });
      
      // Get top clauses by agreement type
      const topClausesByType = {};
      Object.keys(clausesByType).forEach(type => {
        topClausesByType[type] = Object.entries(clausesByType[type])
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([clause, count]) => ({ clause, count }));
      });
      
      // Build relation maps for provider -> agreement types and agreement types -> customers
      const providerToAgreements = {};
      const agreementToCustomers = {};
      
      links.forEach(link => {
        const sourceNode = nodes.find(n => n.id === link.source);
        const targetNode = nodes.find(n => n.id === link.target);
        
        if (sourceNode && targetNode) {
          if (sourceNode.category === 'provider' && targetNode.category === 'agreementType') {
            if (!providerToAgreements[sourceNode.name]) {
              providerToAgreements[sourceNode.name] = [];
            }
            if (!providerToAgreements[sourceNode.name].includes(targetNode.name)) {
              providerToAgreements[sourceNode.name].push(targetNode.name);
            }
          } else if (sourceNode.category === 'agreementType' && targetNode.category === 'customer') {
            if (!agreementToCustomers[sourceNode.name]) {
              agreementToCustomers[sourceNode.name] = [];
            }
            if (!agreementToCustomers[sourceNode.name].includes(targetNode.name)) {
              agreementToCustomers[sourceNode.name].push(targetNode.name);
            }
          }
        }
      });
      
      // Set data for rendering
      setData({
        nodes,
        links: Object.values(aggregatedLinks),
        clausesByType: topClausesByType,
        providerToAgreements,
        agreementToCustomers,
        originalToNormalized,
        normalizedToOriginals,
        documentData
      });
    };
    
    loadData();
  }, []);
  
  // Find top documents related to the selected node
  const findTopDocuments = (node) => {
    if (!data?.documentData || !node) return [];
    
    let filteredDocs = [];
    
    if (node.category === 'provider') {
      // Find documents where this provider is involved
      filteredDocs = data.documentData.filter(doc => doc.provider === node.name);
    } else if (node.category === 'customer') {
      // Find documents where this customer is involved
      filteredDocs = data.documentData.filter(doc => doc.customer === node.name);
    } else if (node.category === 'agreementType') {
      // Find documents with this agreement type
      filteredDocs = data.documentData.filter(doc => doc.normalizedAgreementType === node.name);
    }
    
    // Sort by clause count and take top 10
    return filteredDocs
      .sort((a, b) => b.clauseCount - a.clauseCount)
      .slice(0, 10);
  };

  // Handle node click to show common clauses and top documents
  const handleNodeClick = (node) => {
    setSelectedNode(node);
    
    // Find top documents for this node
    const docs = findTopDocuments(node);
    setTopDocuments(docs);
    
    // Find common clauses
    if (node.category === 'agreementType') {
      // For agreement types, show clauses directly
      setCommonClauses(data?.clausesByType[node.name] || []);
    } else if (node.category === 'provider') {
      // For providers, find related agreement types and collect their clauses
      const relatedAgreements = data?.providerToAgreements[node.name] || [];
      const allClauses = {};
      
      relatedAgreements.forEach(agreement => {
        if (data?.clausesByType[agreement]) {
          data.clausesByType[agreement].forEach(({ clause, count }) => {
            allClauses[clause] = (allClauses[clause] || 0) + count;
          });
        }
      });
      
      // Sort and format
      const sortedClauses = Object.entries(allClauses)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([clause, count]) => ({ clause, count }));
      
      setCommonClauses(sortedClauses);
    } else if (node.category === 'customer') {
      // For customers, find related agreement types and collect their clauses
      const relatedAgreements = [];
      
      // Find all agreements connected to this customer
      Object.entries(data?.agreementToCustomers || {}).forEach(([agreement, customers]) => {
        if (customers.includes(node.name)) {
          relatedAgreements.push(agreement);
        }
      });
      
      // Collect clauses from related agreements
      const allClauses = {};
      relatedAgreements.forEach(agreement => {
        if (data?.clausesByType[agreement]) {
          data.clausesByType[agreement].forEach(({ clause, count }) => {
            allClauses[clause] = (allClauses[clause] || 0) + count;
          });
        }
      });
      
      // Sort and format
      const sortedClauses = Object.entries(allClauses)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([clause, count]) => ({ clause, count }));
      
      setCommonClauses(sortedClauses);
    }
  };

  // Render the Sankey chart
  const renderSankey = () => {
    if (!data || !data.nodes || !data.links) return null;
    
    // Group nodes by category
    const providers = data.nodes.filter(n => n.category === 'provider');
    const agreementTypes = data.nodes.filter(n => n.category === 'agreementType');
    const customers = data.nodes.filter(n => n.category === 'customer');
    
    // Set column widths and positions
    const sankeyWidth = 900;
    const sankeyHeight = 600;
    const nodeWidth = 120;
    const nodeSpacing = 10;
    const columnPositions = {
      provider: 20,
      agreementType: sankeyWidth / 2 - nodeWidth / 2,
      customer: sankeyWidth - nodeWidth - 20
    };
    
    // Calculate heights proportionally
    const getNodeHeights = (nodeGroup, maxHeight) => {
      const totalCount = nodeGroup.reduce((sum, n) => sum + n.count, 0);
      const availableHeight = maxHeight - (nodeSpacing * (nodeGroup.length - 1));
      
      let y = 0;
      return nodeGroup.map(node => {
        const height = Math.max(30, totalCount > 0 
          ? (node.count / totalCount) * availableHeight 
          : availableHeight / nodeGroup.length);
        
        const positionedNode = {
          ...node,
          x: columnPositions[node.category],
          y,
          width: nodeWidth,
          height
        };
        
        y += height + nodeSpacing;
        return positionedNode;
      });
    };
    
    // Position nodes
    const positionedProviders = getNodeHeights(providers, sankeyHeight);
    const positionedAgreementTypes = getNodeHeights(agreementTypes, Math.min(sankeyHeight, agreementTypes.length * 40));
    const positionedCustomers = getNodeHeights(customers, sankeyHeight);
    
    // Combine all positioned nodes
    const positionedNodes = [
      ...positionedProviders,
      ...positionedAgreementTypes,
      ...positionedCustomers
    ];
    
    // Create a node map for link drawing
    const nodeById = {};
    positionedNodes.forEach(node => {
      nodeById[node.id] = node;
    });
    
    // Draw links as bezier curves
    const linkElements = data.links.map((link, i) => {
      const sourceNode = nodeById[link.source];
      const targetNode = nodeById[link.target];
      
      if (!sourceNode || !targetNode) return null;
      
      const sourceX = sourceNode.x + sourceNode.width;
      const sourceY = sourceNode.y + sourceNode.height / 2;
      const targetX = targetNode.x;
      const targetY = targetNode.y + targetNode.height / 2;
      
      // Calculate link width based on value
      const linkWidth = Math.max(1, Math.sqrt(link.value) * 2);
      
      // Set color based on source category
      let linkColor = '#8884d8';
      if (sourceNode.category === 'provider') {
        linkColor = 'rgba(100, 149, 237, 0.5)'; // Blue for provider -> agreement
      } else if (sourceNode.category === 'agreementType') {
        linkColor = 'rgba(46, 139, 87, 0.5)'; // Green for agreement -> customer
      }
      
      // Create a bezier curve path
      const path = `
        M ${sourceX} ${sourceY}
        C ${(sourceX + targetX) / 2} ${sourceY},
          ${(sourceX + targetX) / 2} ${targetY},
          ${targetX} ${targetY}
      `;
      
      return (
        <path 
          key={`link-${i}`}
          d={path}
          stroke={linkColor}
          strokeWidth={linkWidth}
          fill="none"
          opacity={0.7}
        />
      );
    });
    
    // Draw nodes as rectangles with text
    const nodeElements = positionedNodes.map((node, i) => {
      // Set color based on category
      let color = '#8884d8';
      let categoryLabel = '';
      
      if (node.category === 'provider') {
        color = 'cornflowerblue';
        categoryLabel = 'Service Provider';
      } else if (node.category === 'agreementType') {
        color = 'mediumseagreen';
        categoryLabel = 'Agreement Type';
      } else if (node.category === 'customer') {
        color = 'darkorange';
        categoryLabel = 'Customer';
      }
      
      // Highlight if selected
      if (selectedNode && selectedNode.id === node.id) {
        color = '#FF5722'; // Highlight color
      }
      
      // Truncate long names
      const displayName = node.name.length > 18 
        ? node.name.substring(0, 16) + '...' 
        : node.name;
      
      return (
        <g 
          key={`node-${i}`} 
          transform={`translate(${node.x}, ${node.y})`}
          onClick={() => handleNodeClick(node)}
          style={{ cursor: 'pointer' }}
        >
          <rect
            width={node.width}
            height={node.height}
            fill={color}
            rx={5}
            ry={5}
            opacity={0.8}
          />
          
          {/* Node text */}
          <text x={node.width / 2} y={node.height / 2} textAnchor="middle" fill="white" fontSize={9}>
            {displayName}
          </text>
          
          <text x={node.width / 2} y={node.height - 8} textAnchor="middle" fill="white" fontSize={9}>
            ({node.count})
          </text>
          
          {/* Tooltip for consolidated entities */}
          {node.tooltip && (
            <title>{node.tooltip}</title>
          )}
        </g>
      );
    });
    
    return (
      <svg width="100%" height={sankeyHeight} viewBox={`0 0 ${sankeyWidth} ${sankeyHeight}`}>
        <g>
          {linkElements}
          {nodeElements}
        </g>
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="text-lg mb-2">Loading contract data...</div>
        <div className="text-sm text-gray-500">This may take a moment to process the contract information.</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-center text-red-500 text-lg mb-4">Error: {error}</div>
        <div className="bg-red-50 p-4 rounded-md border border-red-200">
          <h3 className="font-medium mb-2">Troubleshooting:</h3>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Check that the CSV file "contract_analysis_output 12.csv" was uploaded correctly</li>
            <li>Ensure the file contains the expected columns (Agreement Classification, Party Names, etc.)</li>
            <li>Try refreshing the page and uploading the file again</li>
            <li>If the problem persists, there might be an issue with the file format or content</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Contract Relationship Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-sm text-gray-500">
            Click on any node to see common clauses and top documents associated with that entity. 
            The middle column shows the Agreement Classifications from the contract data.
          </div>
          
          <div className="overflow-x-auto">
            {renderSankey()}
          </div>
        </CardContent>
      </Card>
      
      {selectedNode && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                Common Clauses for {selectedNode.category === 'provider' ? 'Provider' : 
                                   selectedNode.category === 'customer' ? 'Customer' : 'Agreement Type'}: {selectedNode.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {commonClauses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {commonClauses.map((item, index) => (
                    <div key={index} className="bg-gray-100 p-4 rounded-md">
                      <div className="font-medium">{item.clause.replace(/[\[\]']/g, '')}</div>
                      <div className="text-sm text-gray-500">Frequency: {item.count}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>No common clauses found</div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>
                Top Documents for {selectedNode.category === 'provider' ? 'Provider' : 
                                 selectedNode.category === 'customer' ? 'Customer' : 'Agreement Type'}: {selectedNode.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topDocuments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 text-left border">Document Name</th>
                        <th className="p-2 text-left border">Agreement Type</th>
                        <th className="p-2 text-left border">Provider</th>
                        <th className="p-2 text-left border">Customer</th>
                        <th className="p-2 text-center border">Clause Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topDocuments.map((doc, index) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="p-2 border">{doc.source_filename}</td>
                          <td className="p-2 border">{doc.agreementType}</td>
                          <td className="p-2 border">{doc.party1.role?.toLowerCase().includes('provider') ? 
                            doc.party1.name : doc.party2.name}</td>
                          <td className="p-2 border">{doc.party1.role?.toLowerCase().includes('customer') ? 
                            doc.party1.name : doc.party2.name}</td>
                          <td className="p-2 border text-center">{doc.clauseCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div>No documents found</div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ContractAnalysisDashboard;
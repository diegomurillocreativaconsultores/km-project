import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './components/ui/card';

const ContractHeatmap = () => {
  const [contracts, setContracts] = useState({});
  const [hoveredCell, setHoveredCell] = useState(null);
  const [hoveredContract, setHoveredContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);

  const categories = [
    "Term & Renewal",
    "Payment & Financial Terms",
    "Service Level Agreements",
    "Risk Allocation",
    "Operational Terms",
    "Security & Compliance",
    "Contract Administration"
  ];

  // Validate the structure of loaded JSON data
  const validateContractData = (data, filename) => {
    const validationErrors = [];

    // Check for required top-level properties
    const requiredProperties = ["Executive Summary", "Detailed Category Scoring"];
    requiredProperties.forEach(prop => {
      if (!data[prop]) {
        validationErrors.push(`Missing required property "${prop}" in ${filename}`);
      }
    });

    // Check Executive Summary structure
    if (data["Executive Summary"]) {
      const summaryProps = ["Overall Score", "Key Strengths", "Critical Weaknesses", "Priority Recommendations"];
      summaryProps.forEach(prop => {
        if (!data["Executive Summary"][prop]) {
          validationErrors.push(`Missing "${prop}" in Executive Summary of ${filename}`);
        }
      });
    }

    // Check Detailed Category Scoring structure
    if (data["Detailed Category Scoring"]) {
      categories.forEach(category => {
        if (!data["Detailed Category Scoring"][category]) {
          validationErrors.push(`Missing category "${category}" in ${filename}`);
          return;
        }

        const categoryData = data["Detailed Category Scoring"][category];
        if (typeof categoryData.Score !== 'number') {
          validationErrors.push(`Invalid or missing Score for "${category}" in ${filename}`);
        }

        // Check for required category properties
        const requiredFields = ["Score", "Provisions Analysis", "Deviation from Best Practices", "Improvement Opportunities"];
        requiredFields.forEach(field => {
          if (!categoryData[field] && !categoryData["Specific Provisions Analysis"]) {
            validationErrors.push(`Missing "${field}" in category "${category}" of ${filename}`);
          }
        });
      });
    }

    return validationErrors;
  };

  const importAll = (r) => {
    let files = {};
    r.keys().forEach((key) => {
      files[key] = r(key);
    });
    return files;
  };

  useEffect(() => {
    const loadContractData = async () => {
      try {
        setLoading(true);
        setErrors([]);
        const contractsData = {};
        const validationErrors = [];
        
        // Import all JSON files from the contracts directory
        const allJson = importAll(require.context('./contracts', false, /\.json$/));
        
        for (const [filename, data] of Object.entries(allJson)) {
          try {
            // Data is already parsed as it's imported through webpack

            // Validate data structure
            const fileValidationErrors = validateContractData(data, filename);
            if (fileValidationErrors.length > 0) {
              validationErrors.push(...fileValidationErrors);
              continue;
            }

            // Extract contract name
            // Extract contract name from the file path
            const baseFilename = filename.split('/').pop();
            const nameMatch = baseFilename.match(/\d+_(.+?)(?:-analysis\.json|_.*-analysis\.json)/);
            const contractName = nameMatch 
              ? nameMatch[1].replace(/-/g, ' ').trim()
              : baseFilename.replace(/-analysis\.json$/, '').trim();

            // Build contract object with error checking
            try {
              contractsData[contractName] = {
                name: contractName,
                scores: {},
                details: {},
                executiveSummary: data["Executive Summary"]
              };

              // Process each category with error checking
              categories.forEach(category => {
                const categoryData = data["Detailed Category Scoring"][category];
                if (categoryData) {
                  contractsData[contractName].scores[category] = categoryData.Score;
                  contractsData[contractName].details[category] = {
                    "Provisions Analysis": categoryData["Provisions Analysis"] || 
                                         categoryData["Specific Provisions Analysis"] || 
                                         "Not specified",
                    "Deviation from Best Practices": categoryData["Deviation from Best Practices"] || "Not specified",
                    "Improvement Opportunities": categoryData["Improvement Opportunities"] || "Not specified"
                  };
                } else {
                  validationErrors.push(`Missing data for category "${category}" in ${filename}`);
                }
              });
            } catch (processError) {
              validationErrors.push(`Error processing data for ${filename}: ${processError.message}`);
            }
          } catch (fileError) {
            validationErrors.push(`Error reading file ${filename}: ${fileError.message}`);
          }
        }

        if (Object.keys(contractsData).length === 0) {
          validationErrors.push("No valid contract data could be loaded");
        }

        setContracts(contractsData);
        setErrors(validationErrors);
        setLoading(false);
      } catch (err) {
        setErrors([`Fatal error loading contract data: ${err.message}`]);
        setLoading(false);
      }
    };

    loadContractData();
  }, []);

  const getColor = (score) => {
    if (typeof score !== 'number' || isNaN(score)) {
      return 'rgb(200, 200, 200)'; // Gray for invalid scores
    }
    const red = Math.max(0, Math.min(255, 255 - (score * 25.5)));
    const green = Math.max(0, Math.min(255, score * 25.5));
    return `rgb(${red}, ${green}, 100)`;
  };

  const CellTooltip = ({ contract, category }) => {
    if (!contract || !category || !contracts[contract]?.details[category]) return null;
    const details = contracts[contract].details[category];
    
    return (
      <div className="absolute z-50 p-4 bg-white shadow-lg rounded-lg max-w-md border border-gray-200">
        <h3 className="font-bold mb-2">{category}</h3>
        <div className="space-y-2">
          <p><span className="font-semibold">Analysis:</span> {details["Provisions Analysis"]}</p>
          <p><span className="font-semibold">Deviation:</span> {details["Deviation from Best Practices"]}</p>
          <p><span className="font-semibold">Improvements:</span> {details["Improvement Opportunities"]}</p>
        </div>
      </div>
    );
  };

  const ContractTooltip = ({ contract }) => {
    if (!contract || !contracts[contract]?.executiveSummary) return null;
    const summary = contracts[contract].executiveSummary;
    
    return (
      <div className="absolute z-50 p-4 bg-white shadow-lg rounded-lg max-w-md border border-gray-200">
        <h3 className="font-bold mb-2">Executive Summary</h3>
        <div className="space-y-2">
          <p><span className="font-semibold">Overall Score:</span> {summary["Overall Score"]}</p>
          <div>
            <p className="font-semibold">Key Strengths:</p>
            <ul className="list-disc pl-4">
              {summary["Key Strengths"]?.map((strength, i) => (
                <li key={i}>{strength}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold">Critical Weaknesses:</p>
            <ul className="list-disc pl-4">
              {summary["Critical Weaknesses"]?.map((weakness, i) => (
                <li key={i}>{weakness}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold">Priority Recommendations:</p>
            <ul className="list-disc pl-4">
              {summary["Priority Recommendations"]?.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="w-full max-w-6xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Loading contract data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-6xl">
      <CardContent className="p-6">
        {errors.length > 0 && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="font-medium text-yellow-800 mb-2">Warning:</p>
            <ul className="list-disc pl-4 text-yellow-700">
              {errors.map((error, index) => (
                <li key={index} className="mb-1">{error}</li>
              ))}
            </ul>
          </div>
        )}
        
        {Object.keys(contracts).length > 0 ? (
          <div className="relative overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="p-2 border"></th>
                  {categories.map(category => (
                    <th key={category} className="p-2 border text-sm rotate-45 h-32">
                      <div className="w-32 text-right">{category}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.keys(contracts).map(contractKey => (
                  <tr key={contractKey}>
                    <td 
                      className="p-2 border font-medium relative"
                      onMouseEnter={() => setHoveredContract(contractKey)}
                      onMouseLeave={() => setHoveredContract(null)}
                    >
                      {contracts[contractKey].name}
                      {hoveredContract === contractKey && (
                        <ContractTooltip contract={contractKey} />
                      )}
                    </td>
                    {categories.map(category => (
                      <td
                        key={`${contractKey}-${category}`}
                        className="p-2 border text-center relative"
                        style={{ backgroundColor: getColor(contracts[contractKey].scores[category]) }}
                        onMouseEnter={() => setHoveredCell({ contract: contractKey, category })}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        {contracts[contractKey].scores[category]}
                        {hoveredCell?.contract === contractKey && 
                         hoveredCell?.category === category && (
                          <CellTooltip contract={contractKey} category={category} />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-red-500">No valid contract data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContractHeatmap;
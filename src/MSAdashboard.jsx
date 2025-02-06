import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './components/ui/card';

const ContractHeatmap = () => {
  const [contracts, setContracts] = useState({});
  const [hoveredCell, setHoveredCell] = useState(null);
  const [hoveredContract, setHoveredContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  // New state to track selected cells.
  const [selectedCells, setSelectedCells] = useState([]);

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
    const requiredProperties = ["Executive Summary", "Detailed Category Scoring"];
    requiredProperties.forEach(prop => {
      if (!data[prop]) {
        validationErrors.push(`Missing required property "${prop}" in ${filename}`);
      }
    });
    if (data["Executive Summary"]) {
      const summaryProps = ["Overall Score", "Key Strengths", "Critical Weaknesses", "Priority Recommendations"];
      summaryProps.forEach(prop => {
        if (!data["Executive Summary"][prop]) {
          validationErrors.push(`Missing "${prop}" in Executive Summary of ${filename}`);
        }
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
        const allJson = importAll(require.context('./contracts', false, /\.json$/));
        for (const [filename, data] of Object.entries(allJson)) {
          try {
            const fileValidationErrors = validateContractData(data, filename);
            if (fileValidationErrors.length > 0) {
              validationErrors.push(...fileValidationErrors);
              continue;
            }
            const baseFilename = filename.split('/').pop();
            const contractName = baseFilename.replace(/-analysis\.json$/, '').trim();
            try {
              contractsData[contractName] = {
                name: contractName,
                overallScore: data["Executive Summary"]["Overall Score"],
                scores: {},
                details: {},
                executiveSummary: data["Executive Summary"]
              };
              categories.forEach(category => {
                const categoryData = data["Detailed Category Scoring"][category];
                if (categoryData) {
                  contractsData[contractName].scores[category] = categoryData.Score;
                  contractsData[contractName].details[category] = {
                    "Analysis": categoryData["Provisions with Detailed Analysis"]
                               ? `${categoryData["Provisions with Detailed Analysis"].Clause}: ${categoryData["Provisions with Detailed Analysis"].Commentary}`
                               : "Not specified",
                    "Deviation": categoryData["Deviation"] ||
                                categoryData["Deviation from Best Practices"] || 
                                "Not specified",
                    "Recommendations": categoryData["Recommendations"] ||
                                     categoryData["Improvement Opportunities"] || 
                                     "Not specified"
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

  // Updated getColor function using HSL.
  const getColor = (score) => {
    const clampedScore = Math.max(0, Math.min(10, score));
    const fraction = clampedScore / 10;
    const lowHue = 0;
    const highHue = 120;
    const hue = lowHue + (highHue - lowHue) * fraction;
    let saturation = 40;
    let lightness = 70;
    const adjustmentStart = 0.6;
    if (fraction > adjustmentStart) {
      const adjustFactor = (fraction - adjustmentStart) / (1 - adjustmentStart);
      saturation = 40 + (60 - 40) * adjustFactor;
      lightness = 70 - (70 - 50) * adjustFactor;
    }
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  // --- Tooltip Components & Positioning ---
  const computeTooltipPosition = (rect, tooltipWidth = 300, tooltipHeight = 150) => {
    let left = rect.right;
    if (left + tooltipWidth > window.innerWidth) {
      left = rect.left - tooltipWidth;
      if (left < 0) left = 0;
    }
    let top = rect.top;
    if (top + tooltipHeight > window.innerHeight) {
      top = window.innerHeight - tooltipHeight - 10;
      if (top < 0) top = 0;
    }
    return { left, top };
  };

  const CellTooltip = ({ contract, category, cellRect }) => {
    if (!contract || !category || !contracts[contract]?.details[category]) return null;
    const details = contracts[contract].details[category];
    const tooltipWidth = 300;
    const tooltipHeight = 150;
    const { left, top } = computeTooltipPosition(cellRect, tooltipWidth, tooltipHeight);
    return (
      <div 
        style={{ position: 'fixed', top, left, width: tooltipWidth }}
        className="z-50 p-4 bg-white shadow-lg rounded-lg border border-gray-200"
      >
        <h3 className="font-bold mb-2">{category}</h3>
        <div className="space-y-2">
          <p><span className="font-semibold">Analysis:</span> {details["Analysis"]}</p>
          <p><span className="font-semibold">Deviation:</span> {details["Deviation"]}</p>
          <p><span className="font-semibold">Recommendations:</span> {details["Recommendations"]}</p>
        </div>
      </div>
    );
  };

  const ContractTooltip = ({ contract, cellRect }) => {
    if (!contract || !contracts[contract]?.executiveSummary) return null;
    const summary = contracts[contract].executiveSummary;
    const tooltipWidth = 300;
    const tooltipHeight = 200;
    const { left, top } = computeTooltipPosition(cellRect, tooltipWidth, tooltipHeight);
    return (
      <div 
        style={{ position: 'fixed', top, left, width: tooltipWidth }}
        className="z-50 p-4 bg-white shadow-lg rounded-lg border border-gray-200"
      >
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

  // Helper to toggle cell selection.
  const toggleCellSelection = (contract, category) => {
    setSelectedCells((prevSelected) => {
      const exists = prevSelected.find(
        (cell) => cell.contract === contract && cell.category === category
      );
      if (exists) {
        return prevSelected.filter(
          (cell) => !(cell.contract === contract && cell.category === category)
        );
      } else {
        return [...prevSelected, { contract, category }];
      }
    });
  };

  if (loading) {
    return (
      <Card className="w-full max-w-8xl">
        <CardContent className="p-8">
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Loading contract data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort contracts by overall score.
  const sortedContracts = Object.entries(contracts)
    .sort(([, a], [, b]) => b.overallScore - a.overallScore);

  return (
    <Card className="w-full max-w-8xl">
      <CardContent className="p-8">
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
        
        {sortedContracts.length > 0 ? (
          <div className="relative overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="p-2 border">Contract Name</th>
                  <th className="p-2 border">Overall Score</th>
                  {categories.map(category => (
                    <th key={category} className="p-2 border text-sm rotate-45 h-32">
                      <div className="w-32 text-right">{category}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedContracts.map(([contractKey, contract]) => (
                  <tr key={contractKey}>
                    <td 
                      className="p-2 border font-medium relative"
                      onMouseEnter={(e) => {
                        setHoveredContract({ contract: contractKey, rect: e.currentTarget.getBoundingClientRect() });
                      }}
                      onMouseLeave={() => setHoveredContract(null)}
                    >
                      {contract.name}
                      {hoveredContract?.contract === contractKey && hoveredContract.rect && (
                        <ContractTooltip contract={contractKey} cellRect={hoveredContract.rect} />
                      )}
                    </td>
                    <td 
                      className="p-2 border text-center"
                      style={{ backgroundColor: getColor(contract.overallScore) }}
                    >
                      {contract.overallScore?.toFixed(1)}
                    </td>
                    {categories.map(category => {
                      // Check if this cell is selected.
                      const isSelected = selectedCells.some(
                        cell => cell.contract === contractKey && cell.category === category
                      );
                      return (
                        <td
                          key={`${contractKey}-${category}`}
                          className={`p-2 border text-center relative cursor-pointer ${
                            isSelected ? 'border-blue-500 border-2' : ''
                          }`}
                          style={{ backgroundColor: getColor(contract.scores[category]) }}
                          onMouseEnter={(e) => {
                            setHoveredCell({ 
                              contract: contractKey, 
                              category, 
                              rect: e.currentTarget.getBoundingClientRect() 
                            });
                          }}
                          onMouseLeave={() => setHoveredCell(null)}
                          onClick={() => toggleCellSelection(contractKey, category)}
                        >
                          {contract.scores[category]}
                          {hoveredCell &&
                            hoveredCell.contract === contractKey && 
                            hoveredCell.category === category &&
                            hoveredCell.rect && (
                              <CellTooltip 
                                contract={contractKey} 
                                category={category}
                                cellRect={hoveredCell.rect}
                              />
                          )}
                        </td>
                      );
                    })}
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

        {/* Display the list of selected cells */}
        {selectedCells.length > 0 && (
          <div className="mt-4 p-4 border border-gray-300 rounded">
            <h4 className="font-bold mb-2">Selected Cells:</h4>
            <ul className="list-disc pl-4">
              {selectedCells.map((cell, i) => (
                <li key={i}>{cell.contract} - {cell.category}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContractHeatmap;
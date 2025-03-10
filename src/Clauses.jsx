import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import _ from 'lodash';

const ClauseGroupingApp = () => {
  // State for clauses and groups
  const [clauseData, setClauseData] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedClauses, setSelectedClauses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupToMerge, setGroupToMerge] = useState(null);
  const [mergeTarget, setMergeTarget] = useState(null);
  const [showCounts, setShowCounts] = useState(true);
  const [mergingClauses, setMergingClauses] = useState(false);
  const [selectedClausesToMerge, setSelectedClausesToMerge] = useState([]);
  const [mergedClauseName, setMergedClauseName] = useState('');
  const [mergeGroupId, setMergeGroupId] = useState(null);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Read the CSV file - using the latest file
        const response = await fetch('/data/contract_legal_analysis.csv');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        
        // Parse CSV
        const Papa = await import('papaparse');
        const parsedData = Papa.default.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true
        });
        
        // Process clauses and frequencies
        const clauseOccurrences = {};
        
        parsedData.data.forEach(row => {
          if (row["Clause Captions"] && typeof row["Clause Captions"] === 'string') {
            // Split clauses
            let clauses = [];
            
            if (row["Clause Captions"].includes(';')) {
              clauses = row["Clause Captions"].split(';');
            } else if (row["Clause Captions"].includes(',')) {
              clauses = row["Clause Captions"].split(',');
            } else if (row["Clause Captions"].includes('|')) {
              clauses = row["Clause Captions"].split('|');
            } else {
              clauses = [row["Clause Captions"]];
            }
            
            clauses.forEach(clause => {
              const trimmedClause = clause.trim();
              if (trimmedClause) {
                if (clauseOccurrences[trimmedClause]) {
                  clauseOccurrences[trimmedClause]++;
                } else {
                  clauseOccurrences[trimmedClause] = 1;
                }
              }
            });
          }
        });
        
        // Convert to array and filter
        const sortedClauses = Object.entries(clauseOccurrences)
          .sort((a, b) => b[1] - a[1])
          .map(([clause, count]) => ({ clause, count }))
          .filter(item => item.count >= 3); // Only include clauses that appear in at least 3 agreements
        
        // Initial groups (using predefined conceptual groups)
        const initialGroups = [
          {
            id: 1,
            name: "Term & Termination",
            clauses: ["'Termination'", "['Service Term'", "'Term'", "'Termination Liability'", "'Termination For Cause'", "'MSA Term'", 
                      "'Cancellation and Early Termination Charges'", "'Termination for Cause'", "'Effect of Termination'", 
                      "'Early Termination Fee'", "'Trial Period'", "['Term of Agreement'"]
          },
          {
            id: 2,
            name: "Financial Terms",
            clauses: ["'Charges and Payments'", "'Coverage & Cost'", "'Coverage & Charges'", "'Payments'", "'Invoices and Disputes'", 
                      "'Taxes and Fees'", "'Service Charges'", "'Invoicing and Payment'", "'Payment'", 
                      "'Promotions Related to Service Charges'", "'Late Charges'", "'Prices and Charges'", "'PRICING'", 
                      "'Payment Method (choose one)'", "'RATES AND CHARGES'"]
          },
          {
            id: 3,
            name: "Legal Protections & Risk Allocation",
            clauses: ["'Limitation of Liability'", "'Indemnification'", "'Force Majeure'", "'Warranty Exclusion'", 
                      "'Indemnification and Limitations on Liability'", "'Warranties'", "'Dispute Resolution'", 
                      "'INSURANCE'", "'No Liability'"]
          },
          {
            id: 4,
            name: "Service-Related Provisions",
            clauses: ["'Services'", "'Service Availability'", "'Service Installation and Acceptance'", "'Service Cancellation'", 
                      "'Service Disconnection'", "'Service Interruptions'", "'Service Level Agreements'", 
                      "'Service Delivery and Escalation'", "'Service Level Agreement'", "'Service Overview'", 
                      "'Services Term'", "'Service Attachments'", "'Services Availability'", "'Tiers of Service'", "'New Services'"]
          },
          {
            id: 5,
            name: "Operational Aspects",
            clauses: ["'Customer Obligations'", "'Customer Obligations']", "'Access'", "'Security & Usage'", "'Sales Orders'", 
                      "'Network Changes']", "'Disconnects'", "'Use of Service'", "'Ordering Services'", 
                      "'Regulatory Activity'", "'Acceptable Use Policy'"]
          },
          {
            id: 6,
            name: "Confidentiality & Data Protection",
            clauses: ["'Confidentiality'", "'Security & Usage'", "['Customer Information'"]
          },
          {
            id: 7,
            name: "Contract Structure & Governance",
            clauses: ["'Governing Law'", "'Entire Agreement'", "'Entire Agreement']", "'Conflict Between Agreements'", 
                      "'Agreement Overview'", "['Agreement Overview'", "'Other Terms'", "'Notices'", "'Notification'", 
                      "'Jurisdiction'", "'Order of Precedence'", "'GENERAL TERMS'", "'MISCELLANEOUS'", "'Miscellaneous'"]
          },
          {
            id: 8,
            name: "Intellectual Property & Ownership",
            clauses: ["'Assignment'", "'Subcontracting'", "'License and Other Terms'"]
          },
          {
            id: 9,
            name: "Emergency & Compliance",
            clauses: ["'Emergency Services 911 Dialing'", "'E911 NOTICE'", "'Emergency Service Limitations for Global Office'", 
                      "'511 and other N11 Calling'"]
          },
          {
            id: 10,
            name: "Business Relationship",
            clauses: ["'Default'", "'Acceptance']", "'Publicity'", "'Credit Review & Deposits'", "'Relationship of the Parties'", "'Parties'"]
          },
          {
            id: 11,
            name: "Special Services & Features",
            clauses: ["'RingCentral Global Office'", "'Global Office Provided Only in Connection with Home Country Service'", 
                      "'Relationships with Local Providers'", "'Directory Listing Service'", "'Minute and Calling Credit Bundles'", 
                      "'Operator Assisted Calling'", "'Office Purchase Plans'"]
          },
          {
            id: 12,
            name: "Ungrouped Clauses",
            clauses: []
          }
        ];
        
        // Add all clauses that aren't in any group to the "Ungrouped Clauses" group
        const allGroupedClauses = initialGroups.flatMap(group => group.clauses);
        sortedClauses.forEach(item => {
          if (!allGroupedClauses.includes(item.clause)) {
            initialGroups[initialGroups.length - 1].clauses.push(item.clause);
          }
        });
        
        setClauseData(sortedClauses);
        setGroups(initialGroups);
        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Find frequency for a clause
  const getClauseFrequency = (clause) => {
    const foundClause = clauseData.find(item => item.clause === clause);
    return foundClause ? foundClause.count : 0;
  };

  // Calculate total frequency for a group
  const getGroupTotalFrequency = (groupClauses) => {
    let total = 0;
    groupClauses.forEach(clause => {
      total += getClauseFrequency(clause);
    });
    return total;
  };

  // Handler for creating a new group
  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      const newGroup = {
        id: Math.max(...groups.map(g => g.id), 0) + 1,
        name: newGroupName.trim(),
        clauses: []
      };
      setGroups([...groups, newGroup]);
      setNewGroupName('');
    }
  };

  // Handler for renaming a group
  const handleRenameGroup = (groupId, newName) => {
    if (newName.trim()) {
      setGroups(groups.map(group => 
        group.id === groupId ? {...group, name: newName.trim()} : group
      ));
    }
  };

  // Handler for deleting a group and moving its clauses to Ungrouped
  const handleDeleteGroup = (groupId) => {
    const groupToDelete = groups.find(g => g.id === groupId);
    if (!groupToDelete) return;
    
    // Find or create the Ungrouped category
    let ungrouped = groups.find(g => g.name === "Ungrouped Clauses");
    if (!ungrouped) {
      ungrouped = { id: Math.max(...groups.map(g => g.id), 0) + 1, name: "Ungrouped Clauses", clauses: [] };
      setGroups([
        ...groups.filter(g => g.id !== groupId), 
        ungrouped
      ]);
    } else {
      setGroups(groups.map(group => 
        group.id === ungrouped.id 
          ? {...group, clauses: [...group.clauses, ...groupToDelete.clauses]} 
          : group
      ).filter(g => g.id !== groupId));
    }
  };

  // Handler for moving clauses between groups
  const handleMoveClauses = (sourceGroupId, targetGroupId, clausesToMove) => {
    setGroups(groups.map(group => {
      if (group.id === sourceGroupId) {
        return {...group, clauses: group.clauses.filter(c => !clausesToMove.includes(c))};
      }
      if (group.id === targetGroupId) {
        return {...group, clauses: [...group.clauses, ...clausesToMove]};
      }
      return group;
    }));
    setSelectedClauses([]);
  };

  // Handler for merging two groups
  const handleMergeGroups = () => {
    if (!groupToMerge || !mergeTarget || groupToMerge === mergeTarget) return;
    
    const source = groups.find(g => g.id === groupToMerge);
    const target = groups.find(g => g.id === mergeTarget);
    
    if (!source || !target) return;
    
    setGroups(groups.map(group => {
      if (group.id === target.id) {
        // Add all clauses from source to target
        return {
          ...group, 
          clauses: _.uniq([...group.clauses, ...source.clauses])
        };
      }
      return group;
    }).filter(g => g.id !== source.id));
    
    setGroupToMerge(null);
    setMergeTarget(null);
  };
  
  // Handler for merging clauses within a group
  const handleMergeClauses = () => {
    if (!mergeGroupId || selectedClausesToMerge.length < 2 || !mergedClauseName.trim()) return;
    
    // Create frequencies map for the new merged clause
    const totalFrequency = selectedClausesToMerge.reduce((sum, clause) => 
      sum + getClauseFrequency(clause), 0);
    
    // Update the clauses data
    const updatedClauseData = [...clauseData];
    // Add the new merged clause
    updatedClauseData.push({
      clause: mergedClauseName,
      count: totalFrequency
    });
    setClauseData(updatedClauseData);
    
    // Update the groups
    setGroups(groups.map(group => {
      if (group.id === mergeGroupId) {
        // Remove the merged clauses and add the new one
        const updatedClauses = group.clauses.filter(
          clause => !selectedClausesToMerge.includes(clause)
        );
        updatedClauses.push(mergedClauseName);
        return { ...group, clauses: updatedClauses };
      }
      return group;
    }));
    
    // Reset merging state
    setMergingClauses(false);
    setSelectedClausesToMerge([]);
    setMergedClauseName('');
    setMergeGroupId(null);
  };

  // Handler for moving clauses up or down within a group
  const handleMoveClauseInGroup = (groupId, clauseIndex, direction) => {
    setGroups(groups.map(group => {
      if (group.id === groupId) {
        const newClauses = [...group.clauses];
        
        // Calculate new index
        const newIndex = direction === 'up' 
          ? Math.max(0, clauseIndex - 1) 
          : Math.min(newClauses.length - 1, clauseIndex + 1);
        
        // Swap clauses if new index is different
        if (newIndex !== clauseIndex) {
          const temp = newClauses[clauseIndex];
          newClauses[clauseIndex] = newClauses[newIndex];
          newClauses[newIndex] = temp;
        }
        
        return { ...group, clauses: newClauses };
      }
      return group;
    }));
  };

  // Filtered clauses based on search
  const getFilteredClausesForGroup = (groupClauses) => {
    if (!searchTerm) return groupClauses;
    return groupClauses.filter(clause => 
      clause.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  if (loading) {
    return <div className="p-8 text-center">Loading contract data...</div>;
  }

  return (
    <div className="p-4 max-w-full">
      <h1 className="text-2xl font-bold mb-4">Contract Clause Grouping Tool</h1>
      
      {/* Controls */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Search Clauses:</label>
            <input 
              type="text" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by clause name..."
              className="p-2 border rounded w-full"
            />
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Create New Group:</label>
            <div className="flex">
              <input 
                type="text" 
                value={newGroupName} 
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="New group name..."
                className="p-2 border rounded flex-1"
              />
              <button 
                onClick={handleCreateGroup}
                className="ml-2 bg-blue-600 text-white px-4 py-2 rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Merge Groups:</label>
            <div className="flex flex-wrap gap-2">
              <select 
                value={groupToMerge || ''} 
                onChange={(e) => setGroupToMerge(Number(e.target.value))}
                className="p-2 border rounded flex-1"
              >
                <option value="">Select source group</option>
                {groups.map(group => (
                  <option key={`merge-source-${group.id}`} value={group.id}>
                    {group.name} ({group.clauses.length} clauses)
                  </option>
                ))}
              </select>
              
              <select 
                value={mergeTarget || ''} 
                onChange={(e) => setMergeTarget(Number(e.target.value))}
                className="p-2 border rounded flex-1"
              >
                <option value="">Select target group</option>
                {groups.map(group => (
                  <option key={`merge-target-${group.id}`} value={group.id}>
                    {group.name} ({group.clauses.length} clauses)
                  </option>
                ))}
              </select>
              
              <button 
                onClick={handleMergeGroups}
                disabled={!groupToMerge || !mergeTarget || groupToMerge === mergeTarget}
                className={`px-4 py-2 rounded ${
                  !groupToMerge || !mergeTarget || groupToMerge === mergeTarget 
                    ? 'bg-gray-300 cursor-not-allowed' 
                    : 'bg-purple-600 text-white'
                }`}
              >
                Merge
              </button>
            </div>
          </div>
          
          <div className="flex items-end">
            <label className="flex items-center">
              <input 
                type="checkbox" 
                checked={showCounts} 
                onChange={() => setShowCounts(!showCounts)}
                className="mr-2"
              />
              Show Frequency Counts
            </label>
          </div>
        </div>
      </div>
      
      {/* Group movement interface */}
      {selectedGroup && !mergingClauses && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">
            Moving from: {groups.find(g => g.id === selectedGroup)?.name}
          </h2>
          
          <div className="mb-4">
            <p>Selected {selectedClauses.length} clauses</p>
            {selectedClauses.length > 0 && (
              <div className="mt-2">
                <label className="block text-sm font-medium mb-1">Move to:</label>
                <div className="flex gap-2 flex-wrap">
                  <select 
                    className="p-2 border rounded flex-1"
                    defaultValue=""
                  >
                    <option value="" disabled>Select destination group</option>
                    {groups
                      .filter(g => g.id !== selectedGroup)
                      .map(group => (
                        <option key={`move-target-${group.id}`} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                  </select>
                  
                  <button 
                    onClick={() => {
                      const select = document.querySelector('select[defaultValue=""]');
                      const targetGroupId = Number(select.value);
                      if (targetGroupId) {
                        handleMoveClauses(selectedGroup, targetGroupId, selectedClauses);
                      }
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded"
                    disabled={selectedClauses.length === 0}
                  >
                    Move Clauses
                  </button>
                  
                  <button 
                    onClick={() => {
                      setMergingClauses(true);
                      setMergeGroupId(selectedGroup);
                      setSelectedClausesToMerge(selectedClauses);
                    }}
                    className="bg-purple-600 text-white px-4 py-2 rounded"
                    disabled={selectedClauses.length < 2}
                  >
                    Merge Selected Clauses
                  </button>
                  
                  <button 
                    onClick={() => {
                      setSelectedGroup(null);
                      setSelectedClauses([]);
                    }}
                    className="bg-gray-600 text-white px-4 py-2 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="max-h-40 overflow-y-auto border p-2 rounded bg-white">
            {selectedGroup && (
              <ul className="divide-y">
                {getFilteredClausesForGroup(groups.find(g => g.id === selectedGroup)?.clauses || []).map(clause => (
                  <li key={clause} className="py-1 flex items-center">
                    <input 
                      type="checkbox"
                      checked={selectedClauses.includes(clause)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedClauses([...selectedClauses, clause]);
                        } else {
                          setSelectedClauses(selectedClauses.filter(c => c !== clause));
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="flex-1">{clause}</span>
                    {showCounts && (
                      <span className="text-sm text-gray-500 ml-2">
                        ({getClauseFrequency(clause)})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      
      {/* Clause merging interface */}
      {mergingClauses && (
        <div className="mb-6 p-4 bg-purple-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">
            Merging Clauses in: {groups.find(g => g.id === mergeGroupId)?.name}
          </h2>
          
          <div className="mb-4">
            <p>Selected {selectedClausesToMerge.length} clauses to merge</p>
            <div className="mt-2">
              <label className="block text-sm font-medium mb-1">New merged clause name:</label>
              <div className="flex gap-2 flex-wrap">
                <input 
                  type="text" 
                  value={mergedClauseName} 
                  onChange={(e) => setMergedClauseName(e.target.value)}
                  placeholder="Enter name for the merged clause..."
                  className="p-2 border rounded flex-1"
                />
                
                <button 
                  onClick={handleMergeClauses}
                  className="bg-purple-600 text-white px-4 py-2 rounded"
                  disabled={selectedClausesToMerge.length < 2 || !mergedClauseName.trim()}
                >
                  Merge Clauses
                </button>
                
                <button 
                  onClick={() => {
                    setMergingClauses(false);
                    setSelectedClausesToMerge([]);
                    setMergedClauseName('');
                    setMergeGroupId(null);
                  }}
                  className="bg-gray-600 text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
          
          <div className="max-h-40 overflow-y-auto border p-2 rounded bg-white">
            <p className="font-semibold mb-1">Clauses to be merged:</p>
            <ul className="divide-y">
              {selectedClausesToMerge.map(clause => (
                <li key={clause} className="py-1 flex items-center">
                  <span className="flex-1">{clause}</span>
                  {showCounts && (
                    <span className="text-sm text-gray-500 ml-2">
                      ({getClauseFrequency(clause)})
                    </span>
                  )}
                </li>
              ))}
            </ul>
            
            <div className="mt-4 pt-4 border-t">
              <p className="font-semibold mb-1">
                Combined frequency: {selectedClausesToMerge.reduce((sum, clause) => sum + getClauseFrequency(clause), 0)}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Groups display */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map(group => (
          <Card key={group.id} className="overflow-hidden">
            <CardHeader className="bg-gray-50 pb-2">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg font-bold">
                    {group.name}
                  </CardTitle>
                  <p className="text-sm text-gray-500">
                    {group.clauses.length} clauses
                    {showCounts && ` (${getGroupTotalFrequency(group.clauses)} total occurrences)`}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => {
                      const newName = prompt("Enter new group name:", group.name);
                      if (newName) handleRenameGroup(group.id, newName);
                    }}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    title="Rename group"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={() => {
                      if (window.confirm(`Delete "${group.name}" group?`)) {
                        handleDeleteGroup(group.id);
                      }
                    }}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title="Delete group"
                  >
                    🗑️
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedGroup(group.id);
                      setSelectedClauses([]);
                    }}
                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                    title="Move clauses from this group"
                  >
                    ↗️
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="max-h-64 overflow-y-auto pt-2">
              <ul className="divide-y text-sm">
                {getFilteredClausesForGroup(group.clauses).map((clause, index) => (
                  <li key={clause} className="py-1 flex justify-between group">
                    <span className="flex-1">{clause}</span>
                    <div className="flex items-center">
                      {showCounts && (
                        <span className="text-gray-500 mr-2">
                          ({getClauseFrequency(clause)})
                        </span>
                      )}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex">
                        <button 
                          onClick={() => handleMoveClauseInGroup(group.id, group.clauses.indexOf(clause), 'up')}
                          className="text-blue-600 px-1 hover:bg-blue-50 rounded mr-1"
                          title="Move up"
                          disabled={group.clauses.indexOf(clause) === 0}
                        >
                          ↑
                        </button>
                        <button 
                          onClick={() => handleMoveClauseInGroup(group.id, group.clauses.indexOf(clause), 'down')}
                          className="text-blue-600 px-1 hover:bg-blue-50 rounded"
                          title="Move down"
                          disabled={group.clauses.indexOf(clause) === group.clauses.length - 1}
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
                {getFilteredClausesForGroup(group.clauses).length === 0 && (
                  <li className="py-1 text-gray-400 italic">No clauses match the search</li>
                )}
              </ul>
              {group.clauses.length >= 2 && !selectedGroup && !mergingClauses && (
                <div className="mt-2 pt-2 border-t">
                  <button 
                    onClick={() => {
                      setSelectedGroup(group.id);
                      setSelectedClauses([]);
                    }}
                    className="text-sm p-1 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded"
                    title="Select clauses to merge"
                  >
                    Select Clauses to Merge
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ClauseGroupingApp;
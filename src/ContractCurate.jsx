import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';

// --------------------
// Helper Functions
// --------------------

// Normalize a single token by lowercasing and applying simple pluralization rules.
const normalizeToken = (token) => {
  token = token.toLowerCase();
  if (token.endsWith('ies')) {
    token = token.slice(0, -3) + 'y';
  } else if (token.endsWith('s') && !token.endsWith('ss') && token.length > 3) {
    token = token.slice(0, -1);
  }
  return token;
};

// Basic Jaccard similarity that uses normalized tokens.
const jaccardSimilarity = (a, b) => {
  const tokensA = a.split(/\s+/).map(normalizeToken);
  const tokensB = b.split(/\s+/).map(normalizeToken);
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
};

// Extract the significant part of a name (default: first 2 words)
const extractSignificantPart = (name, numTokens = 2) => {
  return name.split(/\s+/).slice(0, numTokens).join(' ');
};

// Filter out common company type abbreviations.
const filterCompanyTokens = (str) => {
  const companyAbbrs = new Set([
    "llc",
    "llp",
    "inc",
    "corp",
    "co",
    "ltd",
    "corporation",
    "limited",
    "gmbh",
    "plc",
    "s.a.",
    "sa"
  ]);
  const filtered = str.split(/\s+/).filter(token => !companyAbbrs.has(token.toLowerCase()));
  return filtered.length ? filtered.join(' ') : str;
};

// Configurable weighted similarity that uses normalized tokens and filters company abbreviations in the significant part.
const configurableWeightedSimilarity = (a, b, sigWeight = 0.75) => {
  if (!a || !b) return 0;
  const sigA = filterCompanyTokens(extractSignificantPart(a));
  const sigB = filterCompanyTokens(extractSignificantPart(b));
  const sigSim = jaccardSimilarity(sigA, sigB);
  const overallSim = jaccardSimilarity(a, b);
  return sigWeight * sigSim + (1 - sigWeight) * overallSim;
};

// AI-based normalization for Agreement Classification.
const aiNormalizeClassification = (value) => {
  return _.startCase(value);
};

// Group similar values (each item is an object { value, count }) based on the given threshold and similarity function.
// Each group has an id, an array of items, and a total count (sum of counts).
const groupFieldValues = (items, threshold, similarityFn = jaccardSimilarity) => {
  const groups = [];
  items.forEach(item => {
    const normalizedVal = _.toLower(_.trim(item.value));
    const foundGroup = groups.find(group => {
      const rep = _.toLower(_.trim(group.values[0].value));
      return similarityFn(normalizedVal, rep) >= threshold;
    });
    if (foundGroup) {
      foundGroup.values.push(item);
      foundGroup.count += item.count;
    } else {
      groups.push({ id: groups.length + 1, values: [item], count: item.count });
    }
  });
  return groups;
};

// Generate a mapping from raw field values to normalized values based on grouping.
// Here, for each group, the default suggestion is computed from the first item’s value.
const normalizeFieldValues = (items, threshold, similarityFn = jaccardSimilarity) => {
  const groups = groupFieldValues(items, threshold, similarityFn);
  const mapping = {};
  groups.forEach(group => {
    const suggestion = _.startCase(group.values[0].value);
    group.values.forEach(item => {
      mapping[item.value] = suggestion;
    });
  });
  return mapping;
};

// Normalize contracts by adding normalized fields for Party1 Name, Party2 Name, and Agreement Classification.
const normalizeContracts = (data, threshold) => {
  const party1Values = _.countBy(data, row => row['Party1 Name']);
  const party2Values = _.countBy(data, row => row['Party2 Name']);
  const classificationValues = _.countBy(data, row => row['Agreement Classification']);

  const uniqueParty1 = Object.keys(party1Values)
    .filter(v => v)
    .map(v => ({ value: v, count: party1Values[v] }));
  const uniqueParty2 = Object.keys(party2Values)
    .filter(v => v)
    .map(v => ({ value: v, count: party2Values[v] }));
  const uniqueClassifications = Object.keys(classificationValues)
    .filter(v => v)
    .map(v => ({ value: v, count: classificationValues[v] }));

  // For party names, use configurableWeightedSimilarity.
  const party1Mapping = normalizeFieldValues(uniqueParty1, threshold, (a, b) =>
    configurableWeightedSimilarity(a, b)
  );
  const party2Mapping = normalizeFieldValues(uniqueParty2, threshold, (a, b) =>
    configurableWeightedSimilarity(a, b)
  );

  // For classifications, use default grouping then apply AI normalization.
  let classificationMapping = normalizeFieldValues(uniqueClassifications, threshold);
  Object.keys(classificationMapping).forEach(key => {
    classificationMapping[key] = aiNormalizeClassification(classificationMapping[key]);
  });

  return data.map(row => ({
    ...row,
    "Party1 Name Normalized": party1Mapping[row['Party1 Name']] || row['Party1 Name'],
    "Party2 Name Normalized": party2Mapping[row['Party2 Name']] || row['Party2 Name'],
    "Agreement Classification Normalized": classificationMapping[row['Agreement Classification']] || row['Agreement Classification'],
  }));
};

// --------------------
// Reusable Components
// --------------------

// Filter component for dropdown filters.
const Filter = ({ label, value, onChange, options }) => (
  <div className="flex items-center space-x-2">
    <label className="text-sm font-medium text-gray-700">{label}</label>
    <select
      value={value}
      onChange={onChange}
      className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
    >
      <option value="">All</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.value} ({opt.count})
        </option>
      ))}
    </select>
  </div>
);

// Simple Modal component.
const Modal = ({ children, onClose }) => (
  <div className="fixed inset-0 flex items-center justify-center z-50">
    <div className="absolute inset-0 bg-black opacity-50" onClick={onClose}></div>
    <div className="bg-white p-6 rounded shadow-lg z-10 max-w-lg w-full">
      {children}
    </div>
  </div>
);

// --------------------
// Normalization Dialog for a Single Field with Configurable Similarity
// --------------------
const NormalizationDialogForField = ({ fieldName, uniqueValues, initialThreshold, onApply, onCancel }) => {
  const [threshold, setThreshold] = useState(initialThreshold);
  const [overrides, setOverrides] = useState({}); // group id -> override value

  // Similarity mode: either "jaccard" or "weighted"
  const defaultMode = (fieldName === 'Party1 Name' || fieldName === 'Party2 Name') ? 'weighted' : 'jaccard';
  const [similarityMode, setSimilarityMode] = useState(defaultMode);

  // For weighted similarity, allow adjusting the weight for significant tokens.
  const [sigWeight, setSigWeight] = useState(0.75);

  // Choose similarity function based on the mode.
  const simFn =
    similarityMode === 'weighted'
      ? (a, b) => configurableWeightedSimilarity(a, b, sigWeight)
      : jaccardSimilarity;

  // Recompute groups whenever uniqueValues, threshold, similarity mode, or sigWeight changes.
  const groups = useMemo(() => groupFieldValues(uniqueValues, threshold, simFn), [uniqueValues, threshold, simFn]);

  const handleChange = (groupId, value) => {
    setOverrides({ ...overrides, [groupId]: value });
  };

  const handleApply = () => {
    const mapping = {};
    groups.forEach(group => {
      const suggestion = _.startCase(group.values[0].value);
      group.values.forEach(item => {
        mapping[item.value] = overrides[group.id] || suggestion;
      });
    });
    onApply(mapping, threshold);
  };

  return (
    <Modal onClose={onCancel}>
      <h2 className="text-xl font-bold mb-4">Normalize {fieldName}</h2>

      {/* Similarity Mode Selector */}
      <div className="mb-4">
        <label className="block mb-1">Similarity Mode</label>
        <select
          value={similarityMode}
          onChange={(e) => setSimilarityMode(e.target.value)}
          className="p-2 border border-gray-300 rounded"
        >
          <option value="jaccard">Jaccard</option>
          <option value="weighted">Weighted</option>
        </select>
      </div>

      {/* When Weighted is selected, show a slider to configure weight */}
      {similarityMode === 'weighted' && (
        <div className="mb-4">
          <label className="block mb-1">Weight for Significant Tokens: {sigWeight}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={sigWeight}
            onChange={(e) => setSigWeight(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      )}

      {/* Threshold slider */}
      <div className="mb-4">
        <label className="block mb-1">Similarity Threshold: {threshold}</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={threshold}
          onChange={(e) => setThreshold(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Groups container with fixed height and scroll */}
      <div className="mb-4" style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {groups.map(group => (
          <div key={group.id} className="mb-2 border p-2 rounded">
            <p className="text-sm text-gray-600">
              Group {group.id} ({group.count} records): {group.values.map(item => item.value).join(', ')}
            </p>
            <input
              type="text"
              placeholder="Normalized value"
              value={overrides[group.id] || _.startCase(group.values[0].value)}
              onChange={(e) => handleChange(group.id, e.target.value)}
              className="p-1 border rounded w-full"
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
        <button onClick={handleApply} className="px-4 py-2 bg-blue-600 text-white rounded">Apply</button>
      </div>
    </Modal>
  );
};

// --------------------
// Constants for Charge Fields
// --------------------
const RECURRING_KEY = 'Recurring Monthly Charges';
const NONRECURRING_KEY = 'Nonrecurring Charges';

// --------------------
// Main ContractViewer Component
// --------------------
const ContractViewer = () => {
  const [originalContracts, setOriginalContracts] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(true);
  const [editingRow, setEditingRow] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Duplicate control states
  const [showDuplicateGroups, setShowDuplicateGroups] = useState(false);
  const [hideDuplicates, setHideDuplicates] = useState(false);
  const [selectedDuplicateGroup, setSelectedDuplicateGroup] = useState(null);

  // Normalization dialog controls for each field.
  const [showNormalizationParty1, setShowNormalizationParty1] = useState(false);
  const [showNormalizationParty2, setShowNormalizationParty2] = useState(false);
  const [showNormalizationClassification, setShowNormalizationClassification] = useState(false);

  // Filter states – these now expect arrays of objects.
  const [party1Filter, setParty1Filter] = useState('');
  const [party2Filter, setParty2Filter] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('');

  // Similarity threshold used for automatic normalization & duplicate detection.
  const [similarityThreshold, setSimilarityThreshold] = useState(0.8);

  // Unique values (with counts) for filters and normalization dialogs.
  const [uniqueParty1, setUniqueParty1] = useState([]);
  const [uniqueParty2, setUniqueParty2] = useState([]);
  const [uniqueClassifications, setUniqueClassifications] = useState([]);

  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/data/contract_analysis_output (3-21).csv');
        const text = await response.text();
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const dataWithId = results.data.map((row, index) => ({ ...row, id: index }));
            setOriginalContracts(dataWithId);
            const normalizedData = normalizeContracts(dataWithId, similarityThreshold);
            setContracts(normalizedData);

            // Compute frequency counts for each field.
            const party1Counts = _.countBy(dataWithId, row => row['Party1 Name']);
            const party2Counts = _.countBy(dataWithId, row => row['Party2 Name']);
            const classificationCounts = _.countBy(dataWithId, row => row['Agreement Classification']);

            const uniqueParty1Arr = Object.keys(party1Counts)
              .filter(v => v)
              .map(v => ({ value: v, count: party1Counts[v] }));
            uniqueParty1Arr.sort((a, b) => a.value.localeCompare(b.value));
            setUniqueParty1(uniqueParty1Arr);

            const uniqueParty2Arr = Object.keys(party2Counts)
              .filter(v => v)
              .map(v => ({ value: v, count: party2Counts[v] }));
            uniqueParty2Arr.sort((a, b) => a.value.localeCompare(b.value));
            setUniqueParty2(uniqueParty2Arr);

            const uniqueClassificationsArr = Object.keys(classificationCounts)
              .filter(v => v)
              .map(v => ({ value: v, count: classificationCounts[v] }));
            uniqueClassificationsArr.sort((a, b) => a.value.localeCompare(b.value));
            setUniqueClassifications(uniqueClassificationsArr);

            setLoading(false);
          },
          error: (error) => {
            setError(`Error parsing CSV: ${error.message}`);
            setLoading(false);
          }
        });
      } catch (err) {
        setError(`Error loading file: ${err.message}`);
        setLoading(false);
      }
    };
    loadData();
  }, [similarityThreshold]);

  useEffect(() => {
    if (originalContracts.length > 0) {
      const normalizedData = normalizeContracts(originalContracts, similarityThreshold);
      setContracts(normalizedData);
    }
  }, [similarityThreshold, originalContracts]);

  // Duplicate detection using contract.id.
  const { duplicatesMap, duplicateGroups } = useMemo(() => {
    let visited = new Set();
    let duplicateGroups = {};
    let duplicatesMap = {};
    let groupId = 0;
    for (let i = 0; i < contracts.length; i++) {
      const c1 = contracts[i];
      if (visited.has(c1.id)) continue;
      let group = [c1.id];
      visited.add(c1.id);
      for (let j = i + 1; j < contracts.length; j++) {
        const c2 = contracts[j];
        if (visited.has(c2.id)) continue;
        if ((c1[RECURRING_KEY] || '').toString().trim() !== (c2[RECURRING_KEY] || '').toString().trim())
          continue;
        if ((c1[NONRECURRING_KEY] || '').toString().trim() !== (c2[NONRECURRING_KEY] || '').toString().trim())
          continue;
        const party1Sim = configurableWeightedSimilarity(c1['Party1 Name'] || '', c2['Party1 Name'] || '');
        const party2Sim = configurableWeightedSimilarity(c1['Party2 Name'] || '', c2['Party2 Name'] || '');
        const classSim = jaccardSimilarity(c1['Agreement Classification'] || '', c2['Agreement Classification'] || '');
        if (party1Sim >= similarityThreshold && party2Sim >= similarityThreshold && classSim >= similarityThreshold) {
          group.push(c2.id);
          visited.add(c2.id);
        }
      }
      if (group.length > 1) {
        groupId++;
        group.forEach(id => {
          duplicateGroups[id] = groupId;
          duplicatesMap[id] = group;
        });
      }
    }
    return { duplicatesMap, duplicateGroups };
  }, [contracts, similarityThreshold]);

  // Mark primary record (latest Agreement Date) within duplicate groups.
  const finalContracts = useMemo(() => {
    let updatedContracts = contracts.map(contract => ({ ...contract, isPrimary: true }));
    const groups = {};
    updatedContracts.forEach(contract => {
      const groupId = duplicateGroups[contract.id];
      if (groupId) {
        if (!groups[groupId]) groups[groupId] = [];
        groups[groupId].push({ id: contract.id, contract });
      }
    });
    Object.values(groups).forEach(group => {
      const latestRecord = group.reduce((latest, current) =>
        new Date(current.contract['Agreement Date']) > new Date(latest.contract['Agreement Date'])
          ? current
          : latest
      );
      group.forEach(({ id }) => {
        updatedContracts = updatedContracts.map(contract =>
          contract.id === id
            ? {
                ...contract,
                isPrimary: (id === latestRecord.id),
                'Party1 Name Updated': latestRecord.contract['Party1 Name'],
                'Party2 Name Updated': latestRecord.contract['Party2 Name'],
                'Agreement Classification Updated': latestRecord.contract['Agreement Classification']
              }
            : contract
        );
      });
    });
    return updatedContracts;
  }, [contracts, duplicateGroups]);

  // Helper to assign colors for duplicate groups.
  const getDuplicateGroupColor = (groupId) => {
    const colors = [
      'rgba(255, 99, 132, 0.2)',
      'rgba(54, 162, 235, 0.2)',
      'rgba(255, 206, 86, 0.2)',
      'rgba(75, 192, 192, 0.2)',
      'rgba(153, 102, 255, 0.2)',
      'rgba(255, 159, 64, 0.2)',
      'rgba(199, 199, 199, 0.2)'
    ];
    return colors[(groupId - 1) % colors.length];
  };

  // Toggle duplicate group selection.
  const toggleDuplicateGroup = (groupId) => {
    if (selectedDuplicateGroup === groupId) {
      setSelectedDuplicateGroup(null);
    } else {
      setSelectedDuplicateGroup(groupId);
    }
    setCurrentPage(1);
  };

  // Update normalized values for a single field.
  const updateNormalizationForField = (fieldRawName, normalizedFieldName, mapping) => {
    const updated = contracts.map(contract => ({
      ...contract,
      [normalizedFieldName]: mapping[contract[fieldRawName]] || contract[fieldRawName]
    }));
    setContracts(updated);
  };

  const filteredContracts = finalContracts.filter(contract => {
    const baseFilters =
      (party1Filter === '' || contract['Party1 Name'] === party1Filter) &&
      (party2Filter === '' || contract['Party2 Name'] === party2Filter) &&
      (classificationFilter === '' || contract['Agreement Classification'] === classificationFilter);
    let showRecord = baseFilters;
    if (hideDuplicates) {
      if (duplicateGroups[contract.id] !== undefined && !contract.isPrimary) {
        showRecord = false;
      }
    } else if (selectedDuplicateGroup !== null) {
      showRecord = showRecord && (duplicateGroups[contract.id] === selectedDuplicateGroup);
    } else if (showDuplicateGroups) {
      showRecord = showRecord && (duplicateGroups[contract.id] !== undefined);
    }
    return showRecord;
  });

  const totalPages = Math.ceil(filteredContracts.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const handlePageChange = (newPage) => setCurrentPage(newPage);
  const resetFilters = () => {
    setParty1Filter('');
    setParty2Filter('');
    setClassificationFilter('');
    setShowDuplicateGroups(false);
    setHideDuplicates(false);
    setSelectedDuplicateGroup(null);
    setCurrentPage(1);
  };
  const toggleFilters = () => setShowFilters(!showFilters);
  const handleEditClick = (contract, index) => {
    setEditingRow(index);
    setEditedData({ ...contract });
  };
  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const updatedContracts = [...contracts];
      const contractIndex = startIndex + editingRow;
      updatedContracts[contractIndex] = { ...editedData };
      await new Promise(resolve => setTimeout(resolve, 500));
      setContracts(updatedContracts);
      setEditingRow(null);
      setEditedData({});
    } catch (err) {
      setError("Error saving changes: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };
  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditedData({});
  };
  const handleInputChange = (field, value) => setEditedData({ ...editedData, [field]: value });

  // Handler for normalization dialog apply action for each field.
  const handleNormalizationApply = (mapping, newThreshold, field) => {
    if (field === 'Party1 Name') {
      updateNormalizationForField('Party1 Name', 'Party1 Name Normalized', mapping);
    } else if (field === 'Party2 Name') {
      updateNormalizationForField('Party2 Name', 'Party2 Name Normalized', mapping);
    } else if (field === 'Agreement Classification') {
      updateNormalizationForField('Agreement Classification', 'Agreement Classification Normalized', mapping);
    }
    setSimilarityThreshold(newThreshold);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="p-8 rounded-lg shadow-lg bg-white">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-t-4 border-blue-500 rounded-full animate-spin"></div>
            <div className="mt-4 text-xl font-semibold text-gray-700">Loading contract data...</div>
          </div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="p-8 rounded-lg shadow-lg bg-white border-l-4 border-red-500">
          <div className="text-xl font-semibold text-red-600">{error}</div>
          <p className="mt-2 text-gray-600">Please try refreshing the page or contact support.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-2 text-gray-800">Contract Analysis Viewer</h1>
              <p className="text-gray-500">Interactive dashboard for exploring and filtering contract data</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowNormalizationParty1(true)} className="px-4 py-2 bg-purple-100 text-purple-700 border border-purple-300 rounded hover:bg-purple-200 transition-colors shadow-sm">
                Normalize Party1
              </button>
              <button onClick={() => setShowNormalizationParty2(true)} className="px-4 py-2 bg-purple-100 text-purple-700 border border-purple-300 rounded hover:bg-purple-200 transition-colors shadow-sm">
                Normalize Party2
              </button>
              <button onClick={() => setShowNormalizationClassification(true)} className="px-4 py-2 bg-purple-100 text-purple-700 border border-purple-300 rounded hover:bg-purple-200 transition-colors shadow-sm">
                Normalize Classification
              </button>
              <button onClick={toggleFilters} className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-200 transition-colors shadow-sm flex items-center">
                {showFilters ? (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                    Hide Filters
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
                    </svg>
                    Show Filters
                  </>
                )}
              </button>
            </div>
          </div>
          {/* Filters & Controls */}
          {showFilters && (
            <div className="mb-6 p-5 bg-blue-50 rounded-lg border border-blue-100">
              <h2 className="text-lg font-semibold mb-4 text-gray-700">Filters & Controls</h2>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter label="Party1 Name" value={party1Filter} onChange={e => setParty1Filter(e.target.value)} options={uniqueParty1} />
                  <button onClick={() => setShowNormalizationParty1(true)} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors text-sm">
                    Normalize
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Filter label="Party2 Name" value={party2Filter} onChange={e => setParty2Filter(e.target.value)} options={uniqueParty2} />
                  <button onClick={() => setShowNormalizationParty2(true)} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors text-sm">
                    Normalize
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Filter label="Agreement Classification" value={classificationFilter} onChange={e => setClassificationFilter(e.target.value)} options={uniqueClassifications} />
                  <button onClick={() => setShowNormalizationClassification(true)} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors text-sm">
                    Normalize
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Rows per page</label>
                  <select value={rowsPerPage} onChange={e => setRowsPerPage(Number(e.target.value))} className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500">
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Similarity Threshold: {similarityThreshold}</label>
                  <input type="range" min="0" max="1" step="0.05" value={similarityThreshold} onChange={e => setSimilarityThreshold(parseFloat(e.target.value))} className="w-48" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-1">
                    <input type="checkbox" id="showDuplicateGroups" checked={showDuplicateGroups} onChange={() => { setShowDuplicateGroups(!showDuplicateGroups); if (showDuplicateGroups) setSelectedDuplicateGroup(null); }} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                    <label htmlFor="showDuplicateGroups" className="text-sm text-gray-700">Show duplicates with color grouping</label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <input type="checkbox" id="hideDuplicates" checked={hideDuplicates} onChange={() => setHideDuplicates(!hideDuplicates)} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                    <label htmlFor="hideDuplicates" className="text-sm text-gray-700">Hide duplicates</label>
                  </div>
                  {selectedDuplicateGroup !== null && (
                    <div className="flex items-center space-x-1">
                      <span className="text-sm text-gray-700">Selected Group: {selectedDuplicateGroup}</span>
                    </div>
                  )}
                </div>
                <button onClick={resetFilters} className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  Reset Filters
                </button>
              </div>
            </div>
          )}
        </div>
        {/* Summary & Table */}
        <div className="mb-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-800">{startIndex + 1}</span> to <span className="font-semibold text-gray-800">{Math.min(endIndex, filteredContracts.length)}</span> of <span className="font-semibold text-gray-800">{filteredContracts.length}</span> filtered contracts (Total: <span className="font-semibold text-gray-800">{finalContracts.length}</span>)
          </p>
        </div>
        <div className="overflow-x-auto bg-white rounded-lg shadow-lg">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200">
                <th className="p-3 text-left font-semibold text-gray-700">Agreement Name</th>
                <th className="p-3 text-left font-semibold text-gray-700">Classification</th>
                <th className="p-3 text-left font-semibold text-gray-700">Date</th>
                <th className="p-3 text-left font-semibold text-gray-700">Party1 Name</th>
                <th className="p-3 text-left font-semibold text-gray-700">Party1 Role</th>
                <th className="p-3 text-left font-semibold text-gray-700">Party2 Name</th>
                <th className="p-3 text-left font-semibold text-gray-700">Party2 Role</th>
                <th className="p-3 text-left font-semibold text-gray-700">Term</th>
                <th className="p-3 text-left font-semibold text-gray-700">Recurring Charges</th>
                <th className="p-3 text-left font-semibold text-gray-700">Nonrecurring Charges</th>
                <th className="p-3 text-left font-semibold text-gray-700">
                  <div className="flex items-center justify-between">
                    <span>Source File</span>
                    {editingRow === null && (
                      <span className="text-xs text-gray-500 font-normal ml-2">
                        (click <svg className="w-3 h-3 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                        </svg> to edit)
                      </span>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredContracts.slice(startIndex, endIndex).map((contract, index) => (
                <tr key={contract.id} className={`transition-colors border-b border-gray-200 ${editingRow === index ? 'bg-blue-50' : duplicateGroups[contract.id] ? selectedDuplicateGroup === duplicateGroups[contract.id] ? 'bg-green-100 hover:bg-green-200' : showDuplicateGroups ? 'hover:brightness-95' : 'bg-yellow-50 hover:bg-yellow-100' : index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}`} style={showDuplicateGroups && duplicateGroups[contract.id] && editingRow === null ? { backgroundColor: getDuplicateGroupColor(duplicateGroups[contract.id]) } : {}}>
                  {editingRow === index ? (
                    <>
                      <td className="p-3">
                        <input type="text" value={editedData['Agreement Name'] || ''} onChange={(e) => handleInputChange('Agreement Name', e.target.value)} className="w-full p-1 border border-gray-300 rounded" />
                      </td>
                      <td className="p-3">
                        <input type="text" value={editedData['Agreement Classification'] || ''} onChange={(e) => handleInputChange('Agreement Classification', e.target.value)} className="w-full p-1 border border-gray-300 rounded" />
                      </td>
                      <td className="p-3">
                        <input type="text" value={editedData['Agreement Date'] || ''} onChange={(e) => handleInputChange('Agreement Date', e.target.value)} className="w-full p-1 border border-gray-300 rounded" />
                      </td>
                      <td className="p-3">
                        <input type="text" value={editedData['Party1 Name'] || ''} onChange={(e) => handleInputChange('Party1 Name', e.target.value)} className="w-full p-1 border border-gray-300 rounded" />
                      </td>
                      <td className="p-3">
                        <input type="text" value={editedData['Party1 Role'] || ''} onChange={(e) => handleInputChange('Party1 Role', e.target.value)} className="w-full p-1 border border-gray-300 rounded" />
                      </td>
                      <td className="p-3">
                        <input type="text" value={editedData['Party2 Name'] || ''} onChange={(e) => handleInputChange('Party2 Name', e.target.value)} className="w-full p-1 border border-gray-300 rounded" />
                      </td>
                      <td className="p-3">
                        <input type="text" value={editedData['Party2 Role'] || ''} onChange={(e) => handleInputChange('Party2 Role', e.target.value)} className="w-full p-1 border border-gray-300 rounded" />
                      </td>
                      <td className="p-3">
                        <input type="text" value={editedData['Term'] || ''} onChange={(e) => handleInputChange('Term', e.target.value)} className="w-full p-1 border border-gray-300 rounded" />
                      </td>
                      <td className="p-3">
                        <input type="text" value={editedData[RECURRING_KEY] || ''} onChange={(e) => handleInputChange(RECURRING_KEY, e.target.value)} className="w-full p-1 border border-gray-300 rounded" />
                      </td>
                      <td className="p-3">
                        <input type="text" value={editedData[NONRECURRING_KEY] || ''} onChange={(e) => handleInputChange(NONRECURRING_KEY, e.target.value)} className="w-full p-1 border border-gray-300 rounded" />
                      </td>
                      <td className="p-3">
                        <div className="flex space-x-2">
                          <button onClick={handleSaveEdit} disabled={isSaving} className="p-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
                            {isSaving ? 'Saving...' : 'Save'}
                          </button>
                          <button onClick={handleCancelEdit} className="p-1 bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors">
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-3">{contract['Agreement Name'] || 'N/A'}</td>
                      <td className="p-3">
                        {contract['Agreement Classification'] || 'N/A'}<br/>
                        <span className="text-xs text-gray-500">
                          (<em>{contract['Agreement Classification Updated'] || contract['Agreement Classification Normalized'] || 'N/A'}</em>)
                        </span>
                      </td>
                      <td className="p-3">{contract['Agreement Date'] || 'N/A'}</td>
                      <td className="p-3">
                        {contract['Party1 Name'] || 'N/A'}<br/>
                        <span className="text-xs text-gray-500">
                          (<em>{contract['Party1 Name Updated'] || contract['Party1 Name Normalized'] || 'N/A'}</em>)
                        </span>
                      </td>
                      <td className="p-3">{contract['Party1 Role'] || 'N/A'}</td>
                      <td className="p-3">
                        {contract['Party2 Name'] || 'N/A'}<br/>
                        <span className="text-xs text-gray-500">
                          (<em>{contract['Party2 Name Updated'] || contract['Party2 Name Normalized'] || 'N/A'}</em>)
                        </span>
                      </td>
                      <td className="p-3">{contract['Party2 Role'] || 'N/A'}</td>
                      <td className="p-3">{contract['Term'] || 'N/A'}</td>
                      <td className="p-3">{contract[RECURRING_KEY] || 'N/A'}</td>
                      <td className="p-3">{contract[NONRECURRING_KEY] || 'N/A'}</td>
                      <td className="p-3">
                        <div className="flex items-center justify-between">
                          <span className="truncate max-w-xs" title={contract['source_filename']}>
                            {contract['source_filename'] ? contract['source_filename'].split('_')[0] : 'N/A'}
                          </span>
                          <div className="flex items-center">
                            {duplicateGroups[contract.id] && (
                              <span onClick={() => toggleDuplicateGroup(duplicateGroups[contract.id])} className={`mr-2 px-2 py-1 text-xs rounded-full cursor-pointer transition-colors ${selectedDuplicateGroup === duplicateGroups[contract.id] ? 'bg-green-200 text-green-800 hover:bg-green-300' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'}`} title={selectedDuplicateGroup === duplicateGroups[contract.id] ? "Click to clear selection" : "Click to view all duplicates in this group"} style={{ backgroundColor: showDuplicateGroups ? getDuplicateGroupColor(duplicateGroups[contract.id]).replace('0.2', '0.5') : undefined, color: showDuplicateGroups ? '#333' : undefined, border: showDuplicateGroups ? '1px solid rgba(0,0,0,0.2)' : undefined }}>
                                Duplicate Group {duplicateGroups[contract.id]}
                              </span>
                            )}
                            <button onClick={() => handleEditClick(contract, index)} className="ml-2 p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors" title="Edit record">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {filteredContracts.length === 0 && (
                <tr>
                  <td colSpan="11" className="p-8 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <p className="text-lg font-medium">No contracts match the selected filters</p>
                      <p className="text-sm mt-1">Try adjusting your filter criteria</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredContracts.length > 0 && (
          <div className="mt-6 flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-2">
              <button onClick={() => handlePageChange(1)} disabled={currentPage === 1} className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:bg-gray-100 transition-colors duration-200 shadow-sm">
                First
              </button>
              <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:bg-gray-100 transition-colors duration-200 shadow-sm flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                Previous
              </button>
            </div>
            <div className="text-sm bg-blue-50 px-4 py-2 rounded-full text-blue-700 font-medium">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:bg-gray-100 transition-colors duration-200 shadow-sm flex items-center">
                Next
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
              <button onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:bg-gray-100 transition-colors duration-200 shadow-sm">
                Last
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Normalization Dialogs */}
      {showNormalizationParty1 && (
        <NormalizationDialogForField
          fieldName="Party1 Name"
          uniqueValues={uniqueParty1}
          initialThreshold={similarityThreshold}
          onApply={(mapping, newThreshold) => {
            updateNormalizationForField('Party1 Name', 'Party1 Name Normalized', mapping);
            setSimilarityThreshold(newThreshold);
            setShowNormalizationParty1(false);
          }}
          onCancel={() => setShowNormalizationParty1(false)}
        />
      )}
      {showNormalizationParty2 && (
        <NormalizationDialogForField
          fieldName="Party2 Name"
          uniqueValues={uniqueParty2}
          initialThreshold={similarityThreshold}
          onApply={(mapping, newThreshold) => {
            updateNormalizationForField('Party2 Name', 'Party2 Name Normalized', mapping);
            setSimilarityThreshold(newThreshold);
            setShowNormalizationParty2(false);
          }}
          onCancel={() => setShowNormalizationParty2(false)}
        />
      )}
      {showNormalizationClassification && (
        <NormalizationDialogForField
          fieldName="Agreement Classification"
          uniqueValues={uniqueClassifications}
          initialThreshold={similarityThreshold}
          onApply={(mapping, newThreshold) => {
            updateNormalizationForField('Agreement Classification', 'Agreement Classification Normalized', mapping);
            setSimilarityThreshold(newThreshold);
            setShowNormalizationClassification(false);
          }}
          onCancel={() => setShowNormalizationClassification(false)}
        />
      )}
    </div>
  );
};

export default ContractViewer;
import React, { useEffect, useState, useRef } from 'react';
import Papa from 'papaparse';
import * as d3 from 'd3';

const ToggleNetworkGraph = () => {
  const svgRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawData, setRawData] = useState([]);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  
  const [allParty1, setAllParty1] = useState([]);
  const [allParty2, setAllParty2] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [allClassifications, setAllClassifications] = useState([]);
  
  const [selectedParty1, setSelectedParty1] = useState('all');
  const [selectedParty2, setSelectedParty2] = useState('all');
  const [selectedService, setSelectedService] = useState('all');
  const [selectedClassification, setSelectedClassification] = useState('all');
  
  const [centerNodeType, setCenterNodeType] = useState('services');

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/data/contract_financial_analysis (178).csv');
        const csvText = await response.text();
        const result = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true
        });
        
        
        // Process the data for array values in Services
        const processedData = result.data.map(row => {
          let services = row['Services'];
          
          if (typeof services === 'string' && services.startsWith('[') && services.endsWith(']')) {
            try {
              const jsonString = services.replace(/'/g, '"');
              const parsedServices = JSON.parse(jsonString);
              
              if (Array.isArray(parsedServices) && parsedServices.length > 0) {
                services = parsedServices[0];
              }
            } catch (e) {
              console.warn("Could not parse Services:", services);
            }
          }
          
          return {
            ...row,
            'Services': services
          };
        });
        
        setRawData(processedData);
        
        // Extract unique entities
        const party1Set = new Set();
        const party2Set = new Set();
        const serviceSet = new Set();
        const classificationSet = new Set();
        
        processedData.forEach(row => {
          if (row['Party1 Name']) party1Set.add(row['Party1 Name']);
          if (row['Party2 Name']) party2Set.add(row['Party2 Name']);
          if (row['Services']) serviceSet.add(row['Services']);
          if (row['Agreement Classification']) classificationSet.add(row['Agreement Classification']);
        });
        
        setAllParty1(Array.from(party1Set).sort());
        setAllParty2(Array.from(party2Set).sort());
        setAllServices(Array.from(serviceSet).sort());
        setAllClassifications(Array.from(classificationSet).sort());
        
        // Process data with no filters initially
        processData(processedData);
        setLoading(false);
      } catch (err) {
        console.error('Error loading data:', err);
        setError(`Failed to load data: ${err.message}`);
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Re-process data when filters or center node type changes
  useEffect(() => {
    if (rawData.length > 0) {
      processData(rawData);
    }
  }, [
    selectedParty1, 
    selectedParty2, 
    selectedService, 
    selectedClassification,
    centerNodeType, 
    rawData
  ]);
  
  const processData = (data) => {
    // Prepare nodes and links
    const nodes = [];
    const links = [];
    const nodeMap = {};
    let nodeId = 0;
    
    // Function to add a node if it doesn't exist and return its ID
    const addNode = (name, type) => {
      if (!name) return null;
      
      const key = `${type}|${name}`;
      if (!nodeMap[key]) {
        const node = {
          id: nodeId++,
          name,
          type,
          count: 0
        };
        nodes.push(node);
        nodeMap[key] = node;
      }
      
      // Increment counter
      nodeMap[key].count++;
      return nodeMap[key];
    };
    
    // Filter data based on selections
    const filteredData = data.filter(row => {
      const p1Match = selectedParty1 === 'all' || row['Party1 Name'] === selectedParty1;
      const p2Match = selectedParty2 === 'all' || row['Party2 Name'] === selectedParty2;
      const svcMatch = selectedService === 'all' || row['Services'] === selectedService;
      const clsMatch = selectedClassification === 'all' || row['Agreement Classification'] === selectedClassification;
      
      return p1Match && p2Match && svcMatch && clsMatch;
    });
    
    // Track connections based on the center node type
    const leftToMiddleConnections = {};
    const middleToRightConnections = {};
    
    // Process filtered data to create nodes and connections
    filteredData.forEach(row => {
      const party1 = row['Party1 Name'];
      const party2 = row['Party2 Name'];
      const services = row['Services'];
      const classification = row['Agreement Classification'];
      
      // Skip if any required field is missing
      if (!party1 || !party2 || !services || !classification) return;
      
      // Add nodes
      const p1Node = addNode(party1, 'party1');
      const p2Node = addNode(party2, 'party2');
      
      if (centerNodeType === 'services') {
        // Services in the middle
        const svcNode = addNode(services, 'services');
        
        // Track Party1 to Services connection
        const p1svcKey = `${p1Node.id}-${svcNode.id}`;
        if (!leftToMiddleConnections[p1svcKey]) {
          leftToMiddleConnections[p1svcKey] = {
            source: p1Node.id,
            target: svcNode.id,
            count: 0
          };
        }
        leftToMiddleConnections[p1svcKey].count++;
        
        // Track Services to Party2 connection
        const svcp2Key = `${svcNode.id}-${p2Node.id}`;
        if (!middleToRightConnections[svcp2Key]) {
          middleToRightConnections[svcp2Key] = {
            source: svcNode.id,
            target: p2Node.id,
            count: 0
          };
        }
        middleToRightConnections[svcp2Key].count++;
      } else {
        // Agreement Classification in the middle
        const clsNode = addNode(classification, 'classification');
        
        // Track Party1 to Classification connection
        const p1clsKey = `${p1Node.id}-${clsNode.id}`;
        if (!leftToMiddleConnections[p1clsKey]) {
          leftToMiddleConnections[p1clsKey] = {
            source: p1Node.id,
            target: clsNode.id,
            count: 0
          };
        }
        leftToMiddleConnections[p1clsKey].count++;
        
        // Track Classification to Party2 connection
        const clsp2Key = `${clsNode.id}-${p2Node.id}`;
        if (!middleToRightConnections[clsp2Key]) {
          middleToRightConnections[clsp2Key] = {
            source: clsNode.id,
            target: p2Node.id,
            count: 0
          };
        }
        middleToRightConnections[clsp2Key].count++;
      }
    });
    
    // Convert connections to links
    Object.values(leftToMiddleConnections).forEach(conn => {
      links.push({
        source: conn.source,
        target: conn.target,
        value: conn.count,
        type: 'left-middle'
      });
    });
    
    Object.values(middleToRightConnections).forEach(conn => {
      links.push({
        source: conn.source,
        target: conn.target,
        value: conn.count,
        type: 'middle-right'
      });
    });
    
    // Set graph data
    setGraphData({ nodes, links });
  };
  
  useEffect(() => {
    if (graphData.nodes.length === 0 || loading || error) return;
    
    // Create the force-directed graph
    createForceGraph();
  }, [graphData, loading, error]);
  
  const createForceGraph = () => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    
    const width = 1000;
    const height = 800;
    
    // Create container with zoom capability
    const g = svg.attr("viewBox", [0, 0, width, height])
      .append("g");
    
    // Add zoom functionality
    svg.call(d3.zoom()
      .extent([[0, 0], [width, height]])
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      }));
    
    // Color scale for node types
    const colorScale = d3.scaleOrdinal()
      .domain(['party1', 'services', 'classification', 'party2'])
      .range(['#1f77b4', '#d62728', '#ff7f0e', '#2ca02c']);
    
    // Size scale based on node connections
    const sizeScale = d3.scaleSqrt()
      .domain([1, d3.max(graphData.nodes, d => d.count || 1)])
      .range([4, 20]);
    
    // Scale for link width
    const linkWidthScale = d3.scaleLinear()
      .domain([1, d3.max(graphData.links, d => d.value || 1)])
      .range([1, 6]);
    
    // Create a force simulation with separate X positions for each node type
    const simulation = d3.forceSimulation(graphData.nodes)
      .force("link", d3.forceLink(graphData.links)
        .id(d => d.id)
        .distance(100))
      .force("charge", d3.forceManyBody()
        .strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      // Position forces to separate node types horizontally
      .force("x", d3.forceX().x(d => {
        if (d.type === 'party1') return width * 0.2;
        if (d.type === 'services' || d.type === 'classification') return width * 0.5;
        if (d.type === 'party2') return width * 0.8;
        return width / 2;
      }).strength(0.5))
      .force("y", d3.forceY(height / 2).strength(0.05))
      .force("collision", d3.forceCollide().radius(d => sizeScale(d.count) + 5));
    
    // Create links
    const link = g.append("g")
      .selectAll("line")
      .data(graphData.links)
      .join("line")
      .attr("stroke", d => d.type === 'left-middle' ? colorScale('party1') : 
                     (centerNodeType === 'services' ? colorScale('services') : colorScale('classification')))
      .attr("stroke-width", d => linkWidthScale(d.value))
      .attr("stroke-opacity", 0.6);
    
    // Create an info panel that will display node details
    const infoPanel = svg.append("g")
      .attr("class", "info-panel")
      .attr("transform", `translate(${width - 260}, 200)`)
      .style("opacity", 0);
    
    infoPanel.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 250)
      .attr("height", 190)
      .attr("fill", "white")
      .attr("stroke", "#ccc")
      .attr("stroke-width", 1)
      .attr("rx", 5)
      .attr("ry", 5);
    
    const panelTitle = infoPanel.append("text")
      .attr("x", 125)
      .attr("y", 25)
      .attr("text-anchor", "middle")
      .attr("font-weight", "bold")
      .attr("font-size", "14px")
      .text("Node Details");
    
    const panelContent = infoPanel.append("text")
      .attr("x", 10)
      .attr("y", 50)
      .attr("font-size", "12px");
    
    const panelContentLines = [];
    for (let i = 0; i < 8; i++) {
      panelContentLines.push(
        panelContent.append("tspan")
          .attr("x", 10)
          .attr("dy", i === 0 ? 0 : 20)
      );
    }
    
    // Add tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "white")
      .style("border", "1px solid #ddd")
      .style("border-radius", "4px")
      .style("padding", "8px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("display", "none")
      .style("max-width", "300px")
      .style("z-index", "1000");
    
    // State to track currently selected node
    let selectedNodeId = null;
    
    // Create node groups
    const node = g.append("g")
      .selectAll("g")
      .data(graphData.nodes)
      .join("g")
      .call(drag(simulation))
      .on("mouseover", function(event, d) {
        // Don't show hover effects if a node is already selected
        if (selectedNodeId !== null) return;
        
        // Highlight connected links and nodes
        highlightConnections(d.id);
        
        // Show tooltip
        tooltip
          .style("display", "block")
          .html(() => {
            return `<strong>${d.name}</strong><br>Type: ${getTypeName(d.type)}`;
          })
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
        // Don't reset if a node is selected
        if (selectedNodeId !== null) return;
        
        // Reset links and nodes
        resetHighlighting();
        
        // Hide tooltip
        tooltip.style("display", "none");
      })
      .on("click", function(event, d) {
        // Toggle selection state
        if (selectedNodeId === d.id) {
          // Deselect
          selectedNodeId = null;
          resetHighlighting();
          hideInfoPanel();
        } else {
          // Select new node
          selectedNodeId = d.id;
          highlightConnections(d.id);
          showInfoPanel(d);
          
          // Hide tooltip when info panel is shown
          tooltip.style("display", "none");
        }
        
        // Stop event propagation
        event.stopPropagation();
      });
    
    // Add click handler to background to deselect
    svg.on("click", function() {
      if (selectedNodeId !== null) {
        selectedNodeId = null;
        resetHighlighting();
        hideInfoPanel();
      }
    });
    
    // Helper function to highlight connections
    function highlightConnections(nodeId) {
      const connectedNodeIds = new Set();
      
      link
        .attr("stroke-opacity", l => {
          const isConnected = l.source.id === nodeId || l.target.id === nodeId;
          if (isConnected) {
            connectedNodeIds.add(l.source.id === nodeId ? l.target.id : l.source.id);
            return 1;
          }
          return 0.1;
        })
        .attr("stroke-width", l => {
          const isConnected = l.source.id === nodeId || l.target.id === nodeId;
          return isConnected ? linkWidthScale(l.value) + 2 : linkWidthScale(l.value);
        });
      
      node.select("circle")
        .attr("stroke-width", n => {
          return n.id === nodeId || connectedNodeIds.has(n.id) ? 3 : 1.5;
        })
        .attr("stroke", n => {
          return n.id === nodeId ? "#333" : "#fff";
        });
      
      // Bring the selected node and its connections to the front
      node.sort((a, b) => {
        if (a.id === nodeId) return 1;
        if (b.id === nodeId) return -1;
        if (connectedNodeIds.has(a.id)) return 1;
        if (connectedNodeIds.has(b.id)) return -1;
        return 0;
      });
    }
    
    // Helper function to reset highlighting
    function resetHighlighting() {
      link
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", d => linkWidthScale(d.value));
      
      node.select("circle")
        .attr("stroke-width", 1.5)
        .attr("stroke", "#fff");
    }
    
    // Helper function to show info panel
    function showInfoPanel(d) {
      // Find connected links for info panel
      const connections = graphData.links.filter(l => 
        l.source.id === d.id || l.target.id === d.id
      );
      
      // Update panel title
      panelTitle.text(d.name);
      
      // Get type name for display
      const typeName = getTypeName(d.type);
      
      // Update panel content
      panelContentLines[0].text(`Type: ${typeName}`);
      panelContentLines[1].text(`Total Connections: ${d.count}`);
      panelContentLines[2].text("");
      panelContentLines[3].text("Connected to:");
      
      // List a few connections
      connections.slice(0, 3).forEach((conn, i) => {
        const otherNode = conn.source.id === d.id ? 
          graphData.nodes.find(n => n.id === conn.target.id) : 
          graphData.nodes.find(n => n.id === conn.source.id);
        
        if (otherNode) {
          panelContentLines[i + 4].text(`- ${otherNode.name} (${conn.value})`);
        }
      });
      
      if (connections.length > 3) {
        panelContentLines[7].text(`... and ${connections.length - 3} more`);
      } else {
        panelContentLines[7].text("");
      }
      
      // Show the panel
      infoPanel.transition().duration(300).style("opacity", 1);
    }
    
    // Helper function to hide info panel
    function hideInfoPanel() {
      infoPanel.transition().duration(300).style("opacity", 0);
    }
    
    // Helper function to get type name for display
    function getTypeName(type) {
      switch(type) {
        case 'party1': return 'Party 1';
        case 'party2': return 'Party 2';
        case 'services': return 'Services';
        case 'classification': return 'Agreement Classification';
        default: return type;
      }
    }
    
    // Add circles to nodes
    node.append("circle")
      .attr("r", d => sizeScale(d.count))
      .attr("fill", d => colorScale(d.type))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5);
    
    // Add labels
    node.append("text")
      .attr("x", 0)
      .attr("y", d => -sizeScale(d.count) - 3)
      .attr("text-anchor", "middle")
      .attr("font-size", d => Math.min(10, 7 + sizeScale(d.count) / 5) + "px")
      .text(d => d.count > 3 ? 
        (d.name.length > 20 ? d.name.substring(0, 17) + "..." : d.name) : "")
      .attr("pointer-events", "none");
    
    // Update positions on each tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });
    
    // Helper function for dragging nodes
    function drag(simulation) {
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      
      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      
      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }
    
    // Add column headers
    g.append("text")
      .attr("x", width * 0.2)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .text("Party 1");
    
    g.append("text")
      .attr("x", width * 0.5)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .text(centerNodeType === 'services' ? "Services" : "Agreement Classification");
    
    g.append("text")
      .attr("x", width * 0.8)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .text("Party 2");
  };
  
  // Toggle view
  const toggleCenterNodeType = () => {
    setCenterNodeType(prev => prev === 'services' ? 'classification' : 'services');
  };
  
  // Reset all filters
  const resetFilters = () => {
    setSelectedParty1('all');
    setSelectedParty2('all');
    setSelectedService('all');
    setSelectedClassification('all');
  };
  
  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading data...</div>;
  }
  
  if (error) {
    return <div className="text-red-600 p-4">{error}</div>;
  }
  
  return (
    <div className="w-full flex flex-col items-center">
      <h2 className="text-xl font-bold mb-4">Contract Relationship Network</h2>
      
      {/* View toggle */}
      <div className="w-full max-w-6xl mb-4 flex justify-center">
        <div className="bg-white p-4 rounded-lg border shadow-sm flex items-center">
          <span className="mr-4 font-medium">Center Column:</span>
          <button 
            onClick={toggleCenterNodeType}
            className={`px-4 py-2 rounded ${centerNodeType === 'services' ? 'bg-red-100 text-red-800 font-medium' : 'bg-gray-100'}`}
          >
            Services
          </button>
          <span className="mx-2">|</span>
          <button 
            onClick={toggleCenterNodeType}
            className={`px-4 py-2 rounded ${centerNodeType === 'classification' ? 'bg-orange-100 text-orange-800 font-medium' : 'bg-gray-100'}`}
          >
            Agreement Classification
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="w-full max-w-6xl bg-gray-50 p-4 rounded-lg border mb-4">
        <div className="font-bold mb-2">Filter Entities:</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Party 1 Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Party 1
            </label>
            <select
              value={selectedParty1}
              onChange={(e) => setSelectedParty1(e.target.value)}
              className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">All Party 1 Entities</option>
              {allParty1.map(party => (
                <option key={`p1-${party}`} value={party}>
                  {party}
                </option>
              ))}
            </select>
          </div>
          
          {/* Party 2 Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Party 2
            </label>
            <select
              value={selectedParty2}
              onChange={(e) => setSelectedParty2(e.target.value)}
              className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">All Party 2 Entities</option>
              {allParty2.map(party => (
                <option key={`p2-${party}`} value={party}>
                  {party}
                </option>
              ))}
            </select>
          </div>
          
          {/* Services Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Services
            </label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">All Services</option>
              {allServices.map(service => (
                <option key={`svc-${service}`} value={service}>
                  {service}
                </option>
              ))}
            </select>
          </div>
          
          {/* Agreement Classification Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Agreement Classification
            </label>
            <select
              value={selectedClassification}
              onChange={(e) => setSelectedClassification(e.target.value)}
              className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">All Classifications</option>
              {allClassifications.map(cls => (
                <option key={`cls-${cls}`} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Reset button */}
        <button
          onClick={resetFilters}
          className="mt-3 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
        >
          Reset All Filters
        </button>
      </div>
      
      {/* Network graph */}
      <div className="border rounded-lg p-2 overflow-hidden w-full max-w-6xl">
        {graphData.nodes.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-500">
            No matching data with current filters. Try adjusting your selection.
          </div>
        ) : (
          <svg ref={svgRef} width="100%" height="800"></svg>
        )}
      </div>
      
      <div className="text-sm text-gray-600 mt-4 w-full max-w-6xl">
        <ul className="list-disc pl-5">
          <li>Use the buttons above to toggle between Services and Agreement Classification in the middle column</li>
          <li>Use the dropdown menus to filter entities and focus on specific relationships</li>
          <li>Link thickness represents number of contracts between entities</li>
          <li>Node size indicates number of connections (larger = more connections)</li>
          <li>Drag nodes to reposition them, and scroll to zoom</li>
        </ul>
      </div>
    </div>
  );
};

export default ToggleNetworkGraph;
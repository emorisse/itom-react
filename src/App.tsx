import './App.css';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Tab } from '@headlessui/react';
import * as d3 from 'd3';
import { summaries } from './summaries';

interface MindMapNode {
  name: string;
  children?: string[];
}

interface MindMapData {
  name: string;
  children: MindMapNode[];
}

const mindmapData: MindMapData = {
  name: "ITOM Market",
  children: [
    {
      name: "Technologies",
      children: ["Cloud Management", "AIOps", "Automation", "Network Monitoring", "APM", "ITSM", "Infrastructure Monitoring", "Log Analytics"]
    },
    {
      name: "Market Trends",
      children: ["Digital Transformation", "Multi-Cloud Adoption", "Edge Computing", "DevOps Integration", "Containerization", "Cybersecurity"]
    },
    {
      name: "Key Players",
      children: ["ServiceNow", "BMC", "IBM", "Splunk", "Datadog", "Dynatrace", "New Relic", "Microsoft"]
    },
    {
      name: "Challenges",
      children: ["Skill Gap", "Integration Complexity", "Data Privacy", "Legacy Systems"]
    },
    {
      name: "Benefits",
      children: ["Efficiency", "Cost Reduction", "User Experience", "Fast Resolution", "Proactive Prevention"]
    },
    {
      name: "Industry Verticals",
      children: ["Finance", "Healthcare", "Retail", "Manufacturing", "Telecom", "Government"]
    },
    {
      name: "Future Outlook",
      children: ["Predictive Analytics", "Autonomous Ops"]
    }
  ]
};

interface ForceGraphProps {
  data: MindMapNode;
  onNodeSelect: (name: string) => void;
  selectedItems: string[];
}

interface D3Node extends d3.SimulationNodeDatum {
  name: string;
  children?: string[];
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  source: D3Node;
  target: D3Node;
}

const ForceGraph: React.FC<ForceGraphProps> = ({ data, onNodeSelect, selectedItems }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const availableNodes = useMemo(() => {
    if (selectedItems.length === 0) {
      return data.children!;
    } else if (selectedItems.length === 1) {
      return Object.keys(summaries)
        .filter(key => key.split(',').some(item => item === selectedItems[0]))
        .flatMap(key => key.split(','))
        .filter(item => item !== selectedItems[0] && data.children!.includes(item));
    }
    return [];
  }, [data, selectedItems]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height: Math.min(600, width * 0.75) });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!data || !svgRef.current || dimensions.width === 0 || selectedItems.length === 2) return;

    const svg = d3.select(svgRef.current)
      .attr('width', dimensions.width)
      .attr('height', dimensions.height);

    svg.selectAll("*").remove();

    const nodes: D3Node[] = [
      data,
      ...availableNodes.map((child: string) => ({ name: child }))
    ];

    const links: D3Link[] = availableNodes.map((child: string) => ({
      source: nodes[0],
      target: nodes.find(n => n.name === child)!
    }));

    const simulation = d3.forceSimulation<D3Node>(nodes)
      .force("link", d3.forceLink<D3Node, D3Link>(links).id(d => d.name))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force("collision", d3.forceCollide().radius(60));

    const link = svg.selectAll("line")
      .data(links)
      .enter().append("line")
      .style("stroke", "#999")
      .style("stroke-opacity", 0.6)
      .style("stroke-width", 2);

    const node = svg.selectAll("g")
      .data(nodes)
      .enter().append("g");

    node.append("circle")
      .attr("r", d => d.children ? 40 : 30)
      .style("fill", d => {
        if (d.children) return "#69b3a2";
        return selectedItems.includes(d.name) ? "#e74c3c" : "#3498db";
      })
      .style("stroke", "#fff")
      .style("stroke-width", 2)
      .on("click", (event: MouseEvent, d: D3Node) => onNodeSelect(d.name));

    const textBackground = node.append("rect")
      .attr("fill", "white")
      .attr("opacity", 0.8);

    const text = node.append("text")
      .text(d => d.name)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', 'black')
      .style('pointer-events', 'none');

    text.each(function(this: SVGTextElement) {
      const bbox = this.getBBox();
      const padding = 4;
      d3.select(this.parentNode as d3.BaseType)
        .select("rect")
        .attr("x", bbox.x - padding)
        .attr("y", bbox.y - padding)
        .attr("width", bbox.width + (padding * 2))
        .attr("height", bbox.height + (padding * 2))
        .attr("rx", 4)
        .attr("ry", 4);
    });

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x!)
        .attr("y1", d => d.source.y!)
        .attr("x2", d => d.target.x!)
        .attr("y2", d => d.target.y!);

      node.attr("transform", d => {
        const x = Math.max(40, Math.min(dimensions.width - 40, d.x!));
        const y = Math.max(40, Math.min(dimensions.height - 40, d.y!));
        return `translate(${x},${y})`;
      });
    });

    simulation.on("end", () => {
      nodes.forEach(node => {
        node.fx = node.x;
        node.fy = node.y;
      });
    });

    return () => {
      simulation.stop();
    };
  }, [data, onNodeSelect, selectedItems, dimensions, availableNodes]);

  return (
    <div ref={containerRef} style={{ width: '100%', maxWidth: '1024px', margin: '0 auto' }}>
      <svg ref={svgRef}></svg>
    </div>
  );
};

const ITOMInteractiveMindMap: React.FC = () => {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [activeTab, setActiveTab] = useState(0);

  const availableTabs = useMemo(() => {
    if (selectedItems.length === 0) {
      return mindmapData.children;
    } else if (selectedItems.length === 1) {
      const availableItems = Object.keys(summaries)
        .filter(key => key.split(',').some(item => item === selectedItems[0]))
        .flatMap(key => key.split(','))
        .filter(item => item !== selectedItems[0]);

      return mindmapData.children.filter(category =>
        category.children!.some(item => availableItems.includes(item))
      );
    }
    return [];
  }, [selectedItems]);

  const handleNodeSelect = (item: string) => {
    setSelectedItems(prev => {
      let newSelection: string[];
      if (prev.includes(item)) {
        newSelection = prev.filter(i => i !== item);
      } else if (prev.length === 0) {
        newSelection = [item];
      } else if (prev.length === 1) {
        const key = Object.keys(summaries).find(k => 
          k.split(',').includes(prev[0]) && k.split(',').includes(item)
        );
        if (key) {
          newSelection = [prev[0], item];
          setSummary(summaries[key]);
        } else {
          newSelection = prev;
        }
      } else {
        newSelection = [item];
      }

      if (newSelection.length !== 2) {
        setSummary('');
      }

      return newSelection;
    });
  };

  const handleReset = () => {
    setSelectedItems([]);
    setSummary('');
    setActiveTab(0);
  };

  return (
    <div className="container mx-auto p-4" style={{ maxWidth: '1024px' }}>
      <h1 className="text-3xl font-bold mb-6">Welcome to the ITOM Synergy Magic 8-Ball</h1>
	<h2>Pick any two items from different categories, and we'll give you AI-generated Wisdomish™!</h2>
      <div className="flex flex-col lg:flex-row">
        {selectedItems.length < 2 && (
          <div className="w-full lg:w-2/3 mb-6 lg:mb-0">
            <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
              <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
                {availableTabs.map((category) => (
                  <Tab
                    key={category.name}
                    className={({ selected }: { selected: boolean }) =>
                      `w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700
                      ${selected
                        ? 'bg-white shadow'
                        : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                      }`
                    }
                  >
                    {category.name}
                  </Tab>
                ))}
              </Tab.List>
              <Tab.Panels className="mt-2">
                {availableTabs.map((category, idx) => (
                  <Tab.Panel
                    key={idx}
                    className={
                      'rounded-xl bg-white p-3 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2'
                    }
                  >
                    <ForceGraph 
                      data={category} 
                      onNodeSelect={handleNodeSelect} 
                      selectedItems={selectedItems}
                    />
                  </Tab.Panel>
                ))}
              </Tab.Panels>
            </Tab.Group>
          </div>
        )}
        <div className="w-full lg:w-1/3 lg:pl-6">
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Selected Items</h2>
              <button 
                onClick={handleReset}
                className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Reset
              </button>
            </div>
            <ul className="mb-4">
              {selectedItems.map((item, index) => (
                <li key={index} className="mb-1 bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {item}
                </li>
              ))}
            </ul>
            {summary && (
              <div>
                <h2 className="text-xl font-semibold mb-2">Executive Summary</h2>
                <p className="text-sm">{summary}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ITOMInteractiveMindMap;

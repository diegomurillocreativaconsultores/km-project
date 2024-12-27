// ContractRiskDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "./components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { ChevronDown, ChevronUp } from 'lucide-react';

// RiskQuadrant Component
const RiskQuadrant = ({ title, description, impacts, details }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className={`p-4 rounded-lg shadow mb-4 ${expanded ? 'bg-white' : 'bg-blue-50'}`}>
            <div
                className="flex justify-between items-center cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <h3 className="text-lg font-semibold">{title}</h3>
                {expanded ? <ChevronUp /> : <ChevronDown />}
            </div>
            <p className="text-sm mb-4">{description}</p>
            <div className="space-y-2">
                {impacts.map((impact, i) => (
                    <div key={i} className="border-b border-gray-200 pb-2 last:border-0">
                        <p className="font-medium mb-1">{impact.item}</p>
                        <div className="pl-2 space-y-1 text-sm">
                            {impact.parties.map((party, j) => (
                                <div key={j} className="flex justify-between">
                                    <span>{party.name}:</span>
                                    <span className={party.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                                        {party.amount >= 0 ? '+' : ''}{party.amount.toLocaleString('en-US', {
                                            style: 'currency',
                                            currency: 'USD',
                                            maximumFractionDigits: 0,
                                        })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {expanded && details && details.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="space-y-4">
                        {details.map((detail, index) => (
                            <div key={index} className="bg-gray-50 p-4 rounded">
                                <h4 className="font-medium mb-2">{detail.title}</h4>
                                <div className="space-y-2 text-sm">
                                    <p className="text-gray-700">{detail.explanation}</p>
                                    {detail.contractReference && (
                                        <p className="text-gray-600">
                                            <span className="font-medium">Contract Reference: </span>
                                            {detail.contractReference}
                                        </p>
                                    )}
                                    {detail.probability && (
                                        <p className="text-gray-600">
                                            <span className="font-medium">Probability: </span>
                                            {detail.probability}
                                        </p>
                                    )}
                                    {detail.recommendations && (
                                        <div>
                                            <p className="font-medium text-gray-600 mt-2">Recommendations:</p>
                                            <ul className="list-disc pl-4 text-gray-600">
                                                {detail.recommendations.map((rec, idx) => (
                                                    <li key={idx}>{rec}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Summary Tab Content Component
const SummaryContent = ({ contractInfo, riskSummary }) => (
    <Card>
        <CardHeader>
            <CardTitle>Contract Risk Summary</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="text-gray-700 mb-4">
                <p className="mb-2">
                    {contractInfo.title} ({contractInfo.type}) with total contract value of ${contractInfo.totalValue.toLocaleString()}
                </p>
                <div className="bg-blue-50 p-4 rounded mb-4">
                    <h4 className="font-semibold mb-2">Party Favorability Assessment</h4>
                    <p className="mb-2">
                        Overall Contract Balance: 
                        <span className="text-blue-700 font-medium ml-2">
                            {riskSummary.contractBalance.favorabilityScore}% {riskSummary.contractBalance.favoredParty} Favorable
                        </span>
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-sm">
                        {riskSummary.contractBalance.keyPoints.map((point, index) => (
                            <li key={index}>{point}</li>
                        ))}
                    </ul>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded">
                    <h3 className="font-semibold mb-2">Total Value Impact</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span>{contractInfo.parties.customer}</span>
                            <span className="text-red-600">
                                {riskSummary.valueImpact.customer.toLocaleString('en-US', {
                                    style: 'currency',
                                    currency: 'USD',
                                    maximumFractionDigits: 0,
                                })}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>{contractInfo.parties.provider}</span>
                            <span className="text-green-600">
                                +{riskSummary.valueImpact.provider.toLocaleString('en-US', {
                                    style: 'currency',
                                    currency: 'USD',
                                    maximumFractionDigits: 0,
                                })}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                    <h3 className="font-semibold mb-2">Key Risk Transfers</h3>
                    <ul className="text-sm space-y-1">
                        {riskSummary.keyRiskTransfers.map((risk, index) => (
                            <li key={index}>• {risk}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </CardContent>
    </Card>
);

// Negotiation Strategy Tab Content Component
const NegotiationContent = ({ negotiationStrategy }) => (
    <Card>
        <CardHeader>
            <CardTitle>Negotiation Strategy</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <div className="bg-blue-50 p-3 rounded mb-4">
                        <h3 className="font-semibold mb-2">High Priority Items</h3>
                        <ul className="text-sm space-y-1">
                            {negotiationStrategy.customer.highPriority.map((item, index) => (
                                <li key={index}>• {item}</li>
                            ))}
                        </ul>
                    </div>
                    <div className="bg-green-50 p-3 rounded mb-4">
                        <h3 className="font-semibold mb-2">Reasonable Requests</h3>
                        <ul className="text-sm space-y-1">
                            {negotiationStrategy.customer.reasonable.map((item, index) => (
                                <li key={index}>• {item}</li>
                            ))}
                        </ul>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded">
                        <h3 className="font-semibold mb-2">Fallback Positions</h3>
                        <ul className="text-sm space-y-1">
                            {negotiationStrategy.customer.fallback.map((item, index) => (
                                <li key={index}>• {item}</li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div>
                    <div className="bg-red-50 p-3 rounded mb-4">
                        <h3 className="font-semibold mb-2">Non-Negotiable</h3>
                        <ul className="text-sm space-y-1">
                            {negotiationStrategy.provider.nonNegotiable.map((item, index) => (
                                <li key={index}>• {item}</li>
                            ))}
                        </ul>
                    </div>
                    <div className="bg-green-50 p-3 rounded mb-4">
                        <h3 className="font-semibold mb-2">Potential Compromises</h3>
                        <ul className="text-sm space-y-1">
                            {negotiationStrategy.provider.compromises.map((item, index) => (
                                <li key={index}>• {item}</li>
                            ))}
                        </ul>
                    </div>
                    <div className="bg-blue-50 p-3 rounded">
                        <h3 className="font-semibold mb-2">Value-Add Alternatives</h3>
                        <ul className="text-sm space-y-1">
                            {negotiationStrategy.provider.valueAdd.map((item, index) => (
                                <li key={index}>• {item}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
);

// Risk Quadrants Tab Content Component
const QuadrantsContent = ({ riskQuadrants }) => (
    <div className="grid grid-cols-2 gap-6">
        <div>
            <h2 className="text-xl font-bold mb-4">Business Risk</h2>
            <div className="space-y-6">
                <RiskQuadrant {...riskQuadrants.operational} />
                <RiskQuadrant {...riskQuadrants.financial} />
            </div>
        </div>
        <div>
            <h2 className="text-xl font-bold mb-4">Legal Risk</h2>
            <div className="space-y-6">
                <RiskQuadrant {...riskQuadrants.assurance} />
                <RiskQuadrant {...riskQuadrants.insurance} />
            </div>
        </div>
    </div>
);

// Main Dashboard Component
const ContractRiskDashboard = ({ contractData }) => {
    if (!contractData) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-lg">No contract data available</div>
            </div>
        );
    }

    const {
        contractInfo,
        riskSummary,
        negotiationStrategy,
        riskQuadrants
    } = contractData;

    return (
        <div className="max-w-6xl mx-auto p-6">
            <Tabs defaultValue="summary" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="summary">Risk Summary</TabsTrigger>
                    <TabsTrigger value="negotiation">Negotiation Strategy</TabsTrigger>
                    <TabsTrigger value="quadrants">Risk Analysis</TabsTrigger>
                </TabsList>
                <TabsContent value="summary">
                    <SummaryContent 
                        contractInfo={contractInfo} 
                        riskSummary={riskSummary} 
                    />
                </TabsContent>
                <TabsContent value="negotiation">
                    <NegotiationContent 
                        negotiationStrategy={negotiationStrategy} 
                    />
                </TabsContent>
                <TabsContent value="quadrants">
                    <QuadrantsContent 
                        riskQuadrants={riskQuadrants} 
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default ContractRiskDashboard;
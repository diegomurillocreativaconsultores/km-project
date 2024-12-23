
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "./components/ui/card";
import { ChevronDown, ChevronUp } from 'lucide-react';

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

            {expanded && (
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

const ContractRiskDashboard = () => {
    // Risk Summary Card Data
    const riskSummary = {
        totalValue: 100000,
        customerImpact: -156500,
        sfdcImpact: 149500,
        keyRiskTransfers: [
            "Data security responsibility to SFDC",
            "Service availability risk to SFDC",
            "Implementation risk to Customer"
        ]
    };

    // Negotiation Strategy Data
    const negotiationStrategy = {
        customer: {
            highPriority: ["Service Level guarantees", "Data protection terms", "Liability caps"],
            reasonable: ["Extended notice periods", "Custom security controls", "API access guarantees"],
            fallback: ["Standard SLAs with credits", "Basic security reporting", "Limited liability caps"]
        },
        sfdc: {
            nonNegotiable: ["Basic service warranties", "Payment terms", "IP ownership"],
            compromises: ["Custom security controls", "Integration support", "Reporting frequency"],
            valueAdd: ["Premium support options", "Advanced training", "Additional environments"]
        }
    };

    // Risk Quadrants Data
    const operationalRisks = {
        title: "Operational Risk",
        description: "Service delivery and performance risks",
        details: [
            {
                title: "Service Level Commitments",
                explanation: "SFDC commits to 99.9% uptime with standard SLA credits. Service disruption impact is asymmetric, with Customer bearing greater operational impact than SFDC's credit obligations.",
                contractReference: "Section 2.1(c) - Service availability commitment",
                probability: "70% probability of at least one significant disruption annually",
                recommendations: [
                    "Negotiate enhanced SLA credits to better align with business impact",
                    "Include specific response time requirements for critical issues",
                    "Add escalation procedures for repeated violations"
                ]
            },
            {
                title: "Implementation Requirements",
                explanation: "Customer bears primary responsibility for implementation, integration, and user adoption. SFDC's obligations limited to standard support and documentation.",
                contractReference: "Section 3.3 - Customer Responsibilities",
                probability: "90% likelihood of exceeding baseline implementation estimates",
                recommendations: [
                    "Request detailed implementation support commitments",
                    "Define specific integration support requirements",
                    "Include knowledge transfer requirements"
                ]
            },
            {
                title: "Training and Onboarding",
                explanation: "Training costs primarily borne by Customer, with some standard support from SFDC. Additional training services available at extra cost.",
                contractReference: "Section 2.1(b) - Support provisions",
                probability: "85% probability of requiring additional training services",
                recommendations: [
                    "Include basic training package in subscription",
                    "Define specific training deliverables",
                    "Negotiate volume discounts for additional training"
                ]
            }
        ],
        impacts: [
            {
                item: "Service Disruption",
                parties: [
                    { name: "Customer", amount: -8000 },
                    { name: "SFDC", amount: -2000 }
                ]
            },
            {
                item: "Integration Costs",
                parties: [
                    { name: "Customer", amount: -5000 },
                    { name: "SFDC", amount: 0 }
                ]
            },
            {
                item: "Training & Setup",
                parties: [
                    { name: "Customer", amount: -3000 },
                    { name: "SFDC", amount: 1000 }
                ]
            }
        ]
    };

    const financialRisks = {
        title: "Financial Risk",
        description: "Direct monetary impacts and obligations",
        details: [
            {
                title: "Payment Terms and Obligations",
                explanation: "Annual subscription fees paid in advance with net-30 payment terms. Early termination requires payment of remaining contract value with limited refund rights.",
                contractReference: "Section 5.1-5.2 - Fees and Payment Terms",
                probability: "100% certain cost, 25% probability of early termination scenario",
                recommendations: [
                    "Negotiate quarterly payment terms",
                    "Include partial refund rights for early termination",
                    "Add volume-based pricing tiers"
                ]
            },
            {
                title: "Service Credits and Remedies",
                explanation: "Standard SLA credits capped at 10% of monthly fees. Credits are sole remedy for service level failures, limiting Customer's recovery rights.",
                contractReference: "Section 8.2 - SFDC Warranties",
                probability: "40% likelihood of qualifying for credits annually",
                recommendations: [
                    "Increase credit percentages for severe violations",
                    "Add alternative remedies for chronic issues",
                    "Include service credit banking rights"
                ]
            },
            {
                title: "Price Protection and Increases",
                explanation: "SFDC reserves right to increase fees at renewal. No cap on increase percentage. Customer's only remedy is non-renewal.",
                contractReference: "Section 11.2 - Term of Purchased Subscriptions",
                probability: "80% likelihood of price increase at renewal",
                recommendations: [
                    "Add maximum annual increase percentage",
                    "Include price protection for additional purchases",
                    "Negotiate longer term price commitments"
                ]
            }
        ],
        impacts: [
            {
                item: "Subscription Fees",
                parties: [
                    { name: "Customer", amount: -100000 },
                    { name: "SFDC", amount: 100000 }
                ]
            },
            {
                item: "SLA Credits",
                parties: [
                    { name: "Customer", amount: 2000 },
                    { name: "SFDC", amount: -2000 }
                ]
            },
            {
                item: "Early Termination",
                parties: [
                    { name: "Customer", amount: -25000 },
                    { name: "SFDC", amount: 15000 }
                ]
            }
        ]
    };

    const assuranceRisks = {
        title: "Assurances",
        description: "Warranties and compliance requirements",
        details: [
            {
                title: "Security and Data Protection",
                explanation: "SFDC provides standard enterprise security features and commits to maintaining 'appropriate' safeguards. Specific security measures defined in Documentation rather than contract.",
                contractReference: "Section 2.2 - Protection of Customer Data",
                probability: "80% alignment with Customer security requirements",
                recommendations: [
                    "Include specific security control requirements",
                    "Add security audit rights",
                    "Define security incident response requirements"
                ]
            },
            {
                title: "Compliance Obligations",
                explanation: "SFDC warrants compliance with applicable laws but places significant compliance obligations on Customer. Customer responsible for determining adequacy of compliance features.",
                contractReference: "Section 3.3 - Customer Responsibilities",
                probability: "90% of standard compliance requirements covered",
                recommendations: [
                    "Specify required certifications and standards",
                    "Include compliance reporting requirements",
                    "Add representation for specific regulations"
                ]
            },
            {
                title: "Performance Warranties",
                explanation: "Limited warranties for material conformance with Documentation. No warranties for specific performance levels beyond SLAs. Customer acceptance period limited.",
                contractReference: "Section 8.2 - SFDC Warranties",
                probability: "75% probability of meeting all performance requirements",
                recommendations: [
                    "Add specific performance warranties",
                    "Extend acceptance testing period",
                    "Include objective performance standards"
                ]
            }
        ],
        impacts: [
            {
                item: "Security Controls",
                parties: [
                    { name: "Customer", amount: 5000 },
                    { name: "SFDC", amount: -2000 }
                ]
            },
            {
                item: "Compliance Reporting",
                parties: [
                    { name: "Customer", amount: 2500 },
                    { name: "SFDC", amount: -1000 }
                ]
            },
            {
                item: "Audit Rights",
                parties: [
                    { name: "Customer", amount: 2000 },
                    { name: "SFDC", amount: -1500 }
                ]
            }
        ]
    };

    const insuranceRisks = {
        title: "Insurance/Liability",
        description: "Liability and indemnification provisions",
        details: [
            {
                title: "Liability Limitations",
                explanation: "Mutual liability cap at 12 months of fees paid. Excludes gross negligence, willful misconduct, and indemnification obligations. Higher risk impact on Customer due to potential business disruption costs.",
                contractReference: "Section 10.1 - Limitation of Liability",
                probability: "15% probability of material liability event",
                recommendations: [
                    "Increase cap for data protection violations",
                    "Add minimum cap amount regardless of fees",
                    "Expand exclusions from limitation"
                ]
            },
            {
                title: "Indemnification Coverage",
                explanation: "SFDC provides standard IP infringement indemnity. Customer indemnifies for data and use violations. Mutual defense obligations with control rights.",
                contractReference: "Section 9 - Mutual Indemnification",
                probability: "10% probability of indemnification claim",
                recommendations: [
                    "Add data protection indemnification",
                    "Include regulatory violation coverage",
                    "Specify minimum insurance requirements"
                ]
            },
            {
                title: "Insurance Requirements",
                explanation: "Basic insurance requirements for cyber liability and professional services. Coverage limits and specific requirements not detailed in agreement.",
                contractReference: "Section 7.2 - Protection of Customer Data",
                probability: "20% probability of insurance claim",
                recommendations: [
                    "Specify minimum coverage amounts",
                    "Add Customer as additional insured",
                    "Include proof of insurance requirements"
                ]
            }
        ],
        impacts: [
            {
                item: "Liability Cap",
                parties: [
                    { name: "Customer", amount: -50000 },
                    { name: "SFDC", amount: 50000 }
                ]
            },
            {
                item: "IP Indemnification",
                parties: [
                    { name: "Customer", amount: 15000 },
                    { name: "SFDC", amount: -5000 }
                ]
            },
            {
                item: "Cyber Insurance",
                parties: [
                    { name: "Customer", amount: 8000 },
                    { name: "SFDC", amount: -3000 }
                ]
            }
        ]
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            {/* Risk Summary Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Contract Risk Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-gray-700 mb-4">
                        <p className="mb-2">Master Services Agreement (MSA) with total contract value of ${riskSummary.totalValue.toLocaleString()}</p>
                        <div className="bg-blue-50 p-4 rounded mb-4">
                            <h4 className="font-semibold mb-2">Party Favorability Assessment</h4>
                            <p className="mb-2">Overall Contract Balance: <span className="text-blue-700 font-medium">70% SFDC Favorable</span></p>
                            <ul className="list-disc pl-4 space-y-1 text-sm">
                                <li>Strong SFDC position on liability limitations and service terms</li>
                                <li>Customer bears majority of implementation and integration risk</li>
                                <li>Limited Customer negotiation leverage on core terms</li>
                                <li>Standard enterprise SaaS terms with typical SFDC-favorable provisions</li>
                            </ul>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded">
                            <h3 className="font-semibold mb-2">Total Value Impact</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span>Customer</span>
                                    <span className="text-red-600">{riskSummary.customerImpact.toLocaleString('en-US', {
                                        style: 'currency',
                                        currency: 'USD',
                                        maximumFractionDigits: 0,
                                    })}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>SFDC</span>
                                    <span className="text-green-600">+{riskSummary.sfdcImpact.toLocaleString('en-US', {
                                        style: 'currency',
                                        currency: 'USD',
                                        maximumFractionDigits: 0,
                                    })}</span>
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

            {/* Negotiation Strategy Card */}
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
                                    {negotiationStrategy.sfdc.nonNegotiable.map((item, index) => (
                                        <li key={index}>• {item}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-green-50 p-3 rounded mb-4">
                                <h3 className="font-semibold mb-2">Potential Compromises</h3>
                                <ul className="text-sm space-y-1">
                                    {negotiationStrategy.sfdc.compromises.map((item, index) => (
                                        <li key={index}>• {item}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-blue-50 p-3 rounded">
                                <h3 className="font-semibold mb-2">Value-Add Alternatives</h3>
                                <ul className="text-sm space-y-1">
                                    {negotiationStrategy.sfdc.valueAdd.map((item, index) => (
                                        <li key={index}>• {item}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Risk Quadrants */}
            <div className="grid grid-cols-2 gap-6">
                <div>
                    <h2 className="text-xl font-bold mb-4">Business Risk</h2>
                    <div className="space-y-6">
                        <RiskQuadrant {...operationalRisks} />
                        <RiskQuadrant {...financialRisks} />
                    </div>
                </div>
                <div>
                    <h2 className="text-xl font-bold mb-4">Legal Risk</h2>
                    <div className="space-y-6">
                        <RiskQuadrant {...assuranceRisks} />
                        <RiskQuadrant {...insuranceRisks} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContractRiskDashboard;
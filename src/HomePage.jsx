import React, { useState } from 'react';
import { ChevronDown, HelpCircle, UserCircle, MoreVertical } from 'lucide-react';

const HomePage = () => {
  const [templates] = useState([
    {
      name: 'Master Service Agreement',
      clauses: 107,
      lastUpdate: '2025/02/01',
      status: 'Under Review'
    },
    {
      name: 'Addendum',
      clauses: 36,
      lastUpdate: '2025/02/01',
      status: 'Under Review'
    },
    {
      name: 'Service Agreement',
      clauses: 30,
      lastUpdate: '2025/02/01',
      status: 'Under Review'
    },
    {
      name: 'Vendor Agreement',
      clauses: 2,
      lastUpdate: '2025/02/01',
      status: 'Under Review'
    },
    {
      name: 'Amendment',
      clauses: 1,
      lastUpdate: '2025/02/01',
      status: 'Under Review'
    }
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-blue-950 text-white p-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="text-xl font-semibold">Accretive</span>
          <sup className="text-xs">^</sup>
        </div>
        <div className="flex items-center space-x-4">
          <HelpCircle className="w-6 h-6" />
          <UserCircle className="w-6 h-6" />
          <MoreVertical className="w-6 h-6" />
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-6">
        {/* Templates Dropdown */}
        <div className="w-48 mb-6">
          <div className="relative">
            <select className="w-full p-2 border border-gray-300 rounded bg-white appearance-none pr-8">
              <option>Templates</option>
            </select>
            <ChevronDown className="absolute right-2 top-3 w-4 h-4 text-gray-500" />
          </div>
        </div>

        {/* Table Header */}
        <div className="bg-blue-950 text-white px-6 py-3 flex justify-between items-center mb-4 rounded-t-lg">
          <div className="grid grid-cols-5 gap-4 w-full">
            <div>Contract Type</div>
            <div>Number of Contracts</div>
            <div>Update Date</div>
            <div>Status</div>
          </div>
        </div>

        {/* Table Content */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <tbody className="divide-y divide-gray-200">
              {templates.map((template, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4">{template.name}</td>
                  <td className="px-6 py-4">{template.clauses}</td>
                  <td className="px-6 py-4">{template.lastUpdate}</td>
                  <td className="px-6 py-4">{template.updater}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      {template.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
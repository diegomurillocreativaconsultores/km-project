import { useState } from 'react';
import MSAsankey from "./MSAsankey";
import MSAcharts from "./MSAcharts";
import MSAdashboard from "./MSAdashboard";

function App() {
  const [activeComponent, setActiveComponent] = useState('MSAsankey');

  const renderComponent = () => {
    switch (activeComponent) {
      case 'MSAsankey':
        return <MSAsankey />;
      case 'MSAcharts':
        return <MSAcharts />;
      case 'MSAdashboard':
        return <MSAdashboard />;
      default:
        return <MSAsankey />;
    }
  };

  return (
    <div>
      <nav className="p-4 bg-gray-100">
        <button 
          onClick={() => setActiveComponent('MSAsankey')}
          className="px-4 py-2 mr-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Sankey View
        </button>
        <button 
          onClick={() => setActiveComponent('MSAcharts')}
          className="px-4 py-2 mr-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Charts View
        </button>
        <button 
          onClick={() => setActiveComponent('MSAdashboard')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Dashboard View
        </button>
      </nav>
      {renderComponent()}
    </div>
  );
}

export default App;
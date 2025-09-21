
import './App.css';
import GameLanding from './components/GameLanding';
import Party from './Party';
import { MetaPromptProvider } from './MetaPromptContext';


function App() {
  // Simple routing based on window.location.pathname
  const path = window.location.pathname;
  return (
    <MetaPromptProvider>
      {path.startsWith('/party') ? <Party /> : (
        <div className="App">
          <GameLanding />
        </div>
      )}
    </MetaPromptProvider>
  );
}

export default App;

import './App.css'
import { DebugToggle } from './components/DebugToggle';
import { Landing } from './pages/Landing';
import { TeachingSession } from './pages/TeachSession';

function App() {
  return (
    <>
      <Landing />
      <TeachingSession />
      <DebugToggle />
    </>
  );
}

export default App;

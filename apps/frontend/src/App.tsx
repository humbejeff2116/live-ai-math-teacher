import './App.css'
import { DebugToggle } from './components/DebugToggle';
import { TTSToggle } from './components/TTSToggle';
// import { Landing } from './pages/Landing';
import { TeachingSession } from './pages/TeachSession';

function App() {
  return (
    <>
      {/* <Landing /> */}
      <TeachingSession />
      <DebugToggle />
      <TTSToggle/>
    </>
  );
}

export default App;

import './App.css';
import ZoomableExternalSvg from "./components/ZoomableExternalSvg";

import delkareth from './components/delkareth.svg';

function App() {
    return (
        <div className="App">
            <ZoomableExternalSvg url={delkareth}/>
        </div>
    );
}

export default App;

import { Navigate, Route, Routes } from "react-router-dom";
import { useEverDocsWorkspace } from "./hooks/useEverDocsWorkspace";
import { LandingPage } from "./pages/LandingPage";
import { WorkspacePage } from "./pages/WorkspacePage";

export default function App() {
  const workspace = useEverDocsWorkspace();

  return (
    <div className="app-shell">
      <div className="ambient-glow" aria-hidden="true" />
      <Routes>
        <Route path="/" element={<LandingPage workspace={workspace} />} />
        <Route path="/workspace" element={<WorkspacePage workspace={workspace} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

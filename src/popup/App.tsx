import { useState } from 'react';
import { BottomNav, type PopupPage } from './components/BottomNav';
import { TopBar } from './components/TopBar';
import { useExtraction } from './hooks/useExtraction';
import { useSettings } from './hooks/useSettings';
import { ExtractPage } from './pages/ExtractPage';
import { ImportPage } from './pages/ImportPage';
import { LeadsPage } from './pages/LeadsPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  const [page, setPage] = useState<PopupPage>('extract');
  const { settings, update } = useSettings();
  const extraction = useExtraction();

  function toggleTheme() {
    void update({ theme: settings.theme === 'light' ? 'dark' : 'light' });
  }

  return (
    <div className="flex h-full w-full flex-col bg-bg text-text">
      <TopBar theme={settings.theme} onToggleTheme={toggleTheme} />
      <main key={page} className="flex-1 animate-fade-in overflow-y-auto">
        {page === 'extract' ? (
          <ExtractPage extraction={extraction} settings={settings} />
        ) : null}
        {page === 'leads' ? <LeadsPage settings={settings} onNavigate={setPage} /> : null}
        {page === 'import' ? <ImportPage onNavigate={setPage} /> : null}
        {page === 'settings' ? (
          <SettingsPage
            settings={settings}
            updateSettings={update}
            onNavigate={setPage}
            onClearCurrent={extraction.clear}
          />
        ) : null}
      </main>
      <BottomNav page={page} onChange={setPage} />
    </div>
  );
}

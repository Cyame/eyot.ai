import { create } from 'zustand';

export type CanvasTab = 'topology' | 'memberships' | 'instances' | 'meetings' | 'brain';

type WorkspaceCanvasState = {
  readonly activeTabByWorkspace: Readonly<Record<string, CanvasTab>>;
  readonly setActiveTab: (workspaceId: string, tab: CanvasTab) => void;
};

/**
 * Active canvas tab per workspace, keyed by workspace id. Lives in a store so
 * the workspace canvas section in AppShell's sidebar and the page content can
 * stay in sync without prop-drilling through the route Outlet.
 */
export const useWorkspaceCanvasStore = create<WorkspaceCanvasState>()((set) => ({
  activeTabByWorkspace: {},
  setActiveTab: (workspaceId, tab) =>
    set((state) => ({
      activeTabByWorkspace: { ...state.activeTabByWorkspace, [workspaceId]: tab },
    })),
}));

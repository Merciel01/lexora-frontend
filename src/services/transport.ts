import { transition, type TrialAction, type TrialState } from "./model";
import { getDemoRoles } from "./demo";
/** Local authority for the deterministic demonstration; never used in server mode. */
export interface DemoTrialTransport {
  dispatch(snapshot: TrialState, action: TrialAction): TrialState;
  authorizeRole(roleId: string): boolean;
}
export const demoTransport: DemoTrialTransport = {
  dispatch: transition,
  authorizeRole: (roleId) =>
    getDemoRoles().some((r) => r.id === roleId && r.unlocked),
};

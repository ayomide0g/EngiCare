import TrackReportsPage from './TrackReportsPage';
import type { TrackReportsPageProps } from './TrackReportsPage';

export type MyReportsPageProps = Omit<TrackReportsPageProps, 'scope'>;

/** "My Reports": the same list as the faculty feed, limited to the signed-in user's own reports. */
export default function MyReportsPage(props: MyReportsPageProps) {
  return <TrackReportsPage scope="mine" {...props} />;
}
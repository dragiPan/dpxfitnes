import ProgressCharts from '../../../components/ProgressCharts'
import type { Profile } from '../../../lib/types'

export default function OverviewTab({ client }: { client: Profile }) {
  return <ProgressCharts userId={client.id} />
}

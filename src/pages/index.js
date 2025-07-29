import MemeUploader from '../components/MemeUploader';
import MemeFeed from '../components/MemeFeed';

export default function Home() {
  return (
    <div>
      <h1>theMEMES.net</h1>
      <MemeUploader />
      <MemeFeed />
    </div>
  );
}
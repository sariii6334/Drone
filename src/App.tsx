/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DroneGameCanvas } from './components/DroneGameCanvas';

export default function App() {
  return (
    <main className="w-screen h-screen overflow-hidden bg-black font-sans antialiased text-white">
      <DroneGameCanvas />
    </main>
  );
}


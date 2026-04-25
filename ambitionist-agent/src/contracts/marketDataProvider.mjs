import { TREND_SNAPSHOTS } from "../data/trendSnapshots.mjs";

export class MarketDataProvider {
  async getLandscape(_input) {
    throw new Error("MarketDataProvider.getLandscape() must be implemented by a concrete provider.");
  }
}

export class StaticSnapshotMarketProvider extends MarketDataProvider {
  async getLandscape({ targetYear = 2024 }) {
    return TREND_SNAPSHOTS[targetYear] || TREND_SNAPSHOTS[2024];
  }
}

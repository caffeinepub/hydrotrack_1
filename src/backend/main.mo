import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Nat64 "mo:core/Nat64";
import Order "mo:core/Order";
import Migration "migration";

(with migration = Migration.run)
actor {
  module WaterEntry {
    public func compare(w1 : WaterEntry, w2 : WaterEntry) : Order.Order {
      Nat64.compare(w1.id, w2.id);
    };
  };

  type WaterEntry = {
    id : Nat64;
    amount : Nat;
    timestamp : Time.Time;
  };

  type Summary = {
    totalConsumed : Nat;
    remaining : Nat;
    percentage : Nat;
  };

  type UserData = {
    waterEntries : Map.Map<Nat64, WaterEntry>;
    dailyGoal : Nat;
  };

  let users = Map.empty<Principal, UserData>();

  func getOrCreateUser(caller : Principal) : UserData {
    switch (users.get(caller)) {
      case (null) {
        let newUser = {
          waterEntries = Map.empty<Nat64, WaterEntry>();
          dailyGoal = 2000;
        };
        users.add(caller, newUser);
        newUser;
      };
      case (?userData) { userData };
    };
  };

  func isWaterEntryInDay(entry : WaterEntry, dayTimestamp : Time.Time) : Bool {
    let entryDay = entry.timestamp / 86_400_000_000_000;
    let compareDay = dayTimestamp / 86_400_000_000_000;
    entryDay == compareDay;
  };

  public shared ({ caller }) func logWaterIntake(amount : Nat, id : Nat64) : async () {
    let userData = getOrCreateUser(caller);

    let entry : WaterEntry = {
      id;
      amount;
      timestamp = Time.now();
    };
    userData.waterEntries.add(entry.id, entry);
  };

  public shared ({ caller }) func deleteEntry(id : Nat64) : async () {
    let userData = getOrCreateUser(caller);

    if (not userData.waterEntries.containsKey(id)) {
      Runtime.trap("Entry with id " # id.toText() # " does not exist");
    };

    userData.waterEntries.remove(id);
  };

  public shared ({ caller }) func setDailyGoal(goal : Nat) : async () {
    let userData = getOrCreateUser(caller);
    users.add(caller, { userData with dailyGoal = goal });
  };

  public query ({ caller }) func getDailyGoal() : async Nat {
    getOrCreateUser(caller).dailyGoal;
  };

  public query ({ caller }) func getTodaysEntries() : async [WaterEntry] {
    let todayTimestamp = Time.now();
    let userData = getOrCreateUser(caller);

    let filteredIter = userData.waterEntries.values().filter(
      func(entry) {
        isWaterEntryInDay(entry, todayTimestamp);
      }
    );

    filteredIter.toArray().sort();
  };

  public query ({ caller }) func getWeeklyEntries() : async [WaterEntry] {
    let today = Time.now() / 86_400_000_000_000;
    let userData = getOrCreateUser(caller);

    let filteredIter = userData.waterEntries.values().filter(
      func(entry) {
        let entryDay = entry.timestamp / 86_400_000_000_000;
        entryDay >= (today - 6) and entryDay <= today
      }
    );

    filteredIter.toArray().sort();
  };

  public query ({ caller }) func getTodaySummary() : async Summary {
    let todayTimestamp = Time.now();
    let userData = getOrCreateUser(caller);

    let totalConsumed = userData.waterEntries.values().toArray().foldLeft(
      0,
      func(acc, entry) {
        if (isWaterEntryInDay(entry, todayTimestamp)) {
          acc + entry.amount;
        } else {
          acc;
        };
      },
    );

    let remaining = if (userData.dailyGoal > totalConsumed) {
      userData.dailyGoal - totalConsumed;
    } else { 0 };

    let percentage = if (userData.dailyGoal > 0) {
      (totalConsumed * 100) / userData.dailyGoal;
    } else { 0 };

    {
      totalConsumed;
      remaining;
      percentage;
    };
  };

  func calculateStreak(endTimestamp : Time.Time, userData : UserData) : Nat {
    let endDay = endTimestamp / 86_400_000_000_000;

    var streak = 0;
    var dayCounter = 0;

    while (dayCounter <= 6) {
      let currentDay = endDay - dayCounter;

      let dayTotal = userData.waterEntries.values().toArray().foldLeft(
        0,
        func(acc, entry) {
          if ((entry.timestamp / 86_400_000_000_000) == currentDay) {
            acc + entry.amount;
          } else { acc };
        },
      );
      if (dayTotal >= userData.dailyGoal) { streak += 1 } else {
        if (dayCounter != 0) { return streak };
      };
      dayCounter += 1;
    };
    streak;
  };

  public query ({ caller }) func getStreak() : async Nat {
    let now = Time.now();
    let userData = getOrCreateUser(caller);

    calculateStreak(now, userData);
  };
};


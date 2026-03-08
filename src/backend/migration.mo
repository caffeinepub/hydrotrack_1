import Map "mo:core/Map";
import Nat64 "mo:core/Nat64";
import Principal "mo:core/Principal";

module {
  type OldWaterEntry = {
    id : Nat64;
    amount : Nat;
    timestamp : Int;
  };

  type OldUserData = {
    waterEntries : Map.Map<Nat64, OldWaterEntry>;
    dailyGoal : Nat;
  };

  type OldActor = {
    users : Map.Map<Principal, OldUserData>;
  };

  type NewWaterEntry = {
    id : Nat64;
    amount : Nat;
    timestamp : Int;
  };

  type NewUserData = {
    waterEntries : Map.Map<Nat64, NewWaterEntry>;
    dailyGoal : Nat;
  };

  type NewActor = {
    users : Map.Map<Principal, NewUserData>;
  };

  public func run(old : OldActor) : NewActor {
    old;
  };
};


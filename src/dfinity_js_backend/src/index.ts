import {
  query,
  update,
  text,
  Record,
  StableBTreeMap,
  Variant,
  Vec,
  None,
  Some,
  Ok,
  Err,
  ic,
  Principal,
  Opt,
  nat64,
  Result,
  Canister,
} from "azle";

import { v4 as uuidv4 } from "uuid";

// Utility functions for input validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhoneNumber(phoneNumber: string): boolean {
  // Simple phone validation; adjust regex as needed for specific formats
  const phoneRegex = /^[0-9]{10,15}$/;
  return phoneRegex.test(phoneNumber);
}

function validateUserPayload(payload: any): boolean {
  const { name, phoneNumber, email, address } = payload;
  return (
    typeof name === "string" &&
    name.trim().length > 0 &&
    typeof phoneNumber === "string" &&
    isValidPhoneNumber(phoneNumber) &&
    typeof email === "string" &&
    isValidEmail(email) &&
    typeof address === "string" &&
    address.trim().length > 0
  );
}

function validatePetPayload(payload: any): boolean {
  const { name, species, breed, gender, age, petImage, description, healthStatus, shelterId } = payload;
  return (
    typeof name === "string" &&
    name.trim().length > 0 &&
    typeof species === "string" &&
    species.trim().length > 0 &&
    typeof breed === "string" &&
    breed.trim().length > 0 &&
    typeof gender === "string" &&
    gender.trim().length > 0 &&
    typeof age === "string" &&
    age.trim().length > 0 &&
    typeof petImage === "string" &&
    petImage.trim().length > 0 &&
    typeof description === "string" &&
    description.trim().length > 0 &&
    typeof healthStatus === "string" &&
    healthStatus.trim().length > 0 &&
    typeof shelterId === "string" &&
    shelterId.trim().length > 0
  );
}

function validateShelterPayload(payload: any): boolean {
  const { name, location, phoneNumber, email } = payload;
  return (
    typeof name === "string" &&
    name.trim().length > 0 &&
    typeof location === "string" &&
    location.trim().length > 0 &&
    typeof phoneNumber === "string" &&
    isValidPhoneNumber(phoneNumber) &&
    typeof email === "string" &&
    isValidEmail(email)
  );
}

function validateAdoptionPayload(payload: any): boolean {
  const { petId, userId, userPhoneNumber, address, reasonForAdoption } = payload;
  return (
    typeof petId === "string" &&
    petId.trim().length > 0 &&
    typeof userId === "string" &&
    userId.trim().length > 0 &&
    typeof userPhoneNumber === "string" &&
    isValidPhoneNumber(userPhoneNumber) &&
    typeof address === "string" &&
    address.trim().length > 0 &&
    typeof reasonForAdoption === "string" &&
    reasonForAdoption.trim().length > 0
  );
}

// Records and Payload Definitions
const User = Record({
  id: text,
  principal: Principal,
  name: text,
  phoneNumber: text,
  email: text,
  address: text,
  application: Vec(text),
});

const UserPayload = Record({
  name: text,
  phoneNumber: text,
  email: text,
  address: text,
});

const Pet = Record({
  id: text,
  name: text,
  species: text,
  breed: text,
  gender: text,
  age: text,
  petImage: text,
  description: text,
  healthStatus: text,
  shelterId: text,
  status: text,
});

const PetPayload = Record({
  name: text,
  species: text,
  breed: text,
  gender: text,
  age: text,
  petImage: text,
  description: text,
  healthStatus: text,
  shelterId: text,
});

const PetImage = Record({
  petId: text,
  petImage: text,
});

const UpdatePetPayload = Record({
  petId: text,
  healthStatus: text,
  age: text,
});

const Shelter = Record({
  id: text,
  principal: Principal,
  name: text,
  location: text,
  phoneNumber: text,
  email: text,
  pets: Vec(text),
});

const ShelterPayload = Record({
  name: text,
  location: text,
  phoneNumber: text,
  email: text,
});

const UpdateShelterPayload = Record({
  id: text,
  phoneNumber: text,
  email: text,
});

const Adoption = Record({
  id: text,
  petId: text,
  userId: text,
  userPhoneNumber: text,
  address: text,
  reasonForAdoption: text,
  //status: text,
});

const AdoptionPayload = Record({
  petId: text,
  userId: text,
  userPhoneNumber: text,
  address: text,
  reasonForAdoption: text,
});

const AdoptionRecords = Record({
  adoptionId: text,
  userId: text,
  petId: text,
  petName: text,
  userName: text,
  userPhoneNumber: text,
  address: text,
  reasonForAdoption: text,
  dateOfAdoption: text,
  status: text,
});

const UpdateAdoption = Record({
  adoptionId: text,
  userName: text,
  userPhoneNumber: text,
  address: text,
  reasonForAdoption: text,
});

const Error = Variant({
  NotFound: text,
  InvalidPayload: text,
  ValidationError: text,
});

// Storage Definitions
const UsersStorage = StableBTreeMap(0, text, User);
const PetsStorage = StableBTreeMap(1, text, Pet);
const SheltersStorage = StableBTreeMap(2, text, Shelter);
const AdoptionsStorage = StableBTreeMap(3, text, AdoptionRecords);

// Canister Definition
export default Canister({
  // User Operations

  addUser: update([UserPayload], Result(User, Error), (payload) => {
    if (!validateUserPayload(payload)) {
      return Err({ ValidationError: "Invalid user payload. Please check all fields." });
    }

    const userId = uuidv4();
    const user = {
      id: userId,
      principal: ic.caller(),
      application: [],
      ...payload,
    };
    UsersStorage.insert(userId, user);
    return Ok(user);
  }),

  getUsers: query([], Vec(User), () => {
    return UsersStorage.values();
  }),

  getUser: query([text], Opt(User), (id) => {
    return UsersStorage.get(id);
  }),

  getUserOwner: query([], Result(User, Error), () => {
    const users = UsersStorage.values().filter((user) => {
      return user.principal.toText() === ic.caller().toText();
    });
    if (users.length === 0) {
      return Err({ NotFound: `User with principal=${ic.caller()} not found` });
    }
    return Ok(users[0]);
  }),

  // Pet Operations

  addPet: update([PetPayload], Result(Pet, Error), (payload) => {
    if (!validatePetPayload(payload)) {
      return Err({ ValidationError: "Invalid pet payload. Please check all fields." });
    }

    // Check if shelter exists
    const shelterOpt = SheltersStorage.get(payload.shelterId);
    if ("None" in shelterOpt) {
      return Err({ NotFound: `Shelter with ID ${payload.shelterId} not found.` });
    }

    const petId = uuidv4();
    const pet = {
      id: petId,
      status: "notAdopted",
      ...payload,
    };
    PetsStorage.insert(petId, pet);

    // Update shelter's pet list
    const shelter = shelterOpt.Some;
    shelter.pets.push(petId);
    SheltersStorage.insert(shelter.id, shelter);

    return Ok(pet);
  }),

  addPetImage: update([PetImage], Result(PetImage, Error), (payload) => {
    const petOpt = PetsStorage.get(payload.petId);
    if ("None" in petOpt) {
      return Err({ NotFound: `Pet with ID ${payload.petId} not found.` });
    }

    const pet = petOpt.Some;
    pet.petImage = payload.petImage;
    PetsStorage.insert(pet.id, pet);
    return Ok(payload);
  }),

  getPet: query([text], Opt(Pet), (id) => {
    return PetsStorage.get(id);
  }),

  getPets: query([], Vec(Pet), () => {
    return PetsStorage.values();
  }),

  getPetsNotAdopted: query([], Vec(Pet), () => {
    return PetsStorage.values().filter((pet) => pet.status === "notAdopted");
  }),

  updatePetInfo: update([UpdatePetPayload], Result(Pet, Error), (payload) => {
    const petOpt = PetsStorage.get(payload.petId);
    if ("None" in petOpt) {
      return Err({ NotFound: "Pet not found." });
    }

    const pet = petOpt.Some;

    // Validate updated fields
    const updatedPayload = {
      ...pet,
      ...payload,
    };

    if (!validatePetPayload(updatedPayload)) {
      return Err({ ValidationError: "Invalid pet payload. Please check all fields." });
    }

    const updatedPet = {
      ...pet,
      ...payload,
    };
    PetsStorage.insert(pet.id, updatedPet);
    return Ok(updatedPet);
  }),

  // Shelter Operations

  createShelter: update([ShelterPayload], Result(Shelter, Error), (payload) => {
    if (!validateShelterPayload(payload)) {
      return Err({ ValidationError: "Invalid shelter payload. Please check all fields." });
    }

    const shelterId = uuidv4();
    const shelter = {
      id: shelterId,
      principal: ic.caller(),
      pets: [],
      ...payload,
    };
    SheltersStorage.insert(shelterId, shelter);
    return Ok(shelter);
  }),

  getShelter: query([text], Opt(Shelter), (id) => {
    return SheltersStorage.get(id);
  }),

  getShelters: query([], Vec(Shelter), () => {
    return SheltersStorage.values();
  }),

  getShelterOwner: query([], Result(Shelter, Error), () => {
    const shelters = SheltersStorage.values().filter((shelter) => {
      return shelter.principal.toText() === ic.caller().toText();
    });
    if (shelters.length === 0) {
      return Err({ NotFound: `Shelter with principal=${ic.caller()} not found` });
    }
    return Ok(shelters[0]);
  }),

  updateShelterInfo: update([UpdateShelterPayload], Result(Shelter, Error), (payload) => {
    const shelterOpt = SheltersStorage.get(payload.id);
    if ("None" in shelterOpt) {
      return Err({ NotFound: "Shelter not found." });
    }

    const shelter = shelterOpt.Some;

    // Validate updated fields
    const updatedPayload = {
      ...shelter,
      ...payload,
    };

    if (!validateShelterPayload(updatedPayload)) {
      return Err({ ValidationError: "Invalid shelter payload. Please check all fields." });
    }

    const updatedShelter = {
      ...shelter,
      ...payload,
    };
    SheltersStorage.insert(shelter.id, updatedShelter);
    return Ok(updatedShelter);
  }),

  searchPetsBySpecies: query([text], Vec(Pet), (species) => {
    return PetsStorage.values().filter((pet) => {
      return pet.species.toLowerCase() === species.toLowerCase();
    });
  }),

  // Adoption Operations

  fileForAdoption: update([AdoptionPayload], Result(AdoptionRecords, Error), (payload) => {
    if (!validateAdoptionPayload(payload)) {
      return Err({ ValidationError: "Invalid adoption payload. Please check all fields." });
    }

    const userOpt = UsersStorage.get(payload.userId);
    if ("None" in userOpt) {
      return Err({ NotFound: `User with ID ${payload.userId} not found.` });
    }

    const petOpt = PetsStorage.get(payload.petId);
    if ("None" in petOpt) {
      return Err({ NotFound: `Pet with ID ${payload.petId} not found.` });
    }

    const user = userOpt.Some;
    const pet = petOpt.Some;

    // Check if pet is already adopted or pending
    if (pet.status !== "notAdopted") {
      return Err({ InvalidPayload: "Pet is not available for adoption." });
    }

    const adoptionId = uuidv4();
    const adoption = {
      id: adoptionId,
      petId: pet.id,
      userId: user.id,
      userPhoneNumber: user.phoneNumber,
      address: user.address,
      reasonForAdoption: payload.reasonForAdoption,
      //status: "pending",
    };

    const records = {
      adoptionId: adoption.id,
      userId: adoption.userId,
      petId: adoption.petId,
      petName: pet.name,
      userName: user.name,
      userPhoneNumber: adoption.userPhoneNumber,
      address: adoption.address,
      reasonForAdoption: adoption.reasonForAdoption,
      dateOfAdoption: new Date().toISOString(),
      status: "pending",
    };

    user.application.push(records.adoptionId);
    UsersStorage.insert(user.id, user);
    AdoptionsStorage.insert(records.adoptionId, records);

    return Ok(records);
  }),

  getAdoptionRecords: query([], Vec(AdoptionRecords), () => {
    return AdoptionsStorage.values();
  }),

  getAdoptionRecord: query([text], Opt(AdoptionRecords), (id) => {
    return AdoptionsStorage.get(id);
  }),

  updateAdoptionRecord: update([UpdateAdoption], Result(AdoptionRecords, Error), (payload) => {
    const adoptionOpt = AdoptionsStorage.get(payload.adoptionId);
    if ("None" in adoptionOpt) {
      return Err({ NotFound: "Adoption record not found." });
    }

    const adoption = adoptionOpt.Some;

    // Validate updated fields if necessary
    // For simplicity, assuming all fields are strings and non-empty
    const { userName, userPhoneNumber, address, reasonForAdoption } = payload;
    if (
      typeof userName !== "string" ||
      userName.trim().length === 0 ||
      typeof userPhoneNumber !== "string" ||
      !isValidPhoneNumber(userPhoneNumber) ||
      typeof address !== "string" ||
      address.trim().length === 0 ||
      typeof reasonForAdoption !== "string" ||
      reasonForAdoption.trim().length === 0
    ) {
      return Err({ ValidationError: "Invalid adoption update payload." });
    }

    const updatedAdoption = {
      ...adoption,
      userName,
      userPhoneNumber,
      address,
      reasonForAdoption,
    };

    AdoptionsStorage.insert(adoption.id, updatedAdoption);
    return Ok(updatedAdoption);
  }),

  completeAdoption: update([text], Result(AdoptionRecords, Error), (adoptionId) => {
    const adoptionOpt = AdoptionsStorage.get(adoptionId);
    if ("None" in adoptionOpt) {
      return Err({ NotFound: "Adoption record not found." });
    }

    const adoption = adoptionOpt.Some;

    if (adoption.status !== "pending") {
      return Err({ InvalidPayload: "Only pending adoptions can be completed." });
    }

    const petOpt = PetsStorage.get(adoption.petId);
    if ("None" in petOpt) {
      return Err({ NotFound: "Associated pet not found." });
    }

    const pet = petOpt.Some;

    const updatedPet = {
      ...pet,
      status: "adopted",
    };
    PetsStorage.insert(pet.id, updatedPet);

    const updatedAdoption = {
      ...adoption,
      status: "completed",
    };
    AdoptionsStorage.insert(adoptionId, updatedAdoption);

    return Ok(updatedAdoption);
  }),

  failAdoption: update([text], Result(AdoptionRecords, Error), (adoptionId) => {
    const adoptionOpt = AdoptionsStorage.get(adoptionId);
    if ("None" in adoptionOpt) {
      return Err({ NotFound: "Adoption record not found." });
    }

    const adoption = adoptionOpt.Some;

    if (adoption.status !== "pending") {
      return Err({ InvalidPayload: "Only pending adoptions can be failed." });
    }

    const updatedAdoption = {
      ...adoption,
      status: "failed",
    };
    AdoptionsStorage.insert(adoptionId, updatedAdoption);

    return Ok(updatedAdoption);
  }),
});

// Mocking crypto for environments where it's not available
globalThis.crypto = {
  // @ts-ignore
  getRandomValues: () => {
    let array = new Uint8Array(32);

    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }

    return array;
  },
};

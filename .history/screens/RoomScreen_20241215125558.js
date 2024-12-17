import React, { useEffect, useState } from "react";
import { Text, View, TextInput, TouchableOpacity, Alert } from "react-native";

import { db } from "../firebase";
import {
  addDoc,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  deleteField,
} from "firebase/firestore";

export default function RoomScreen({
  setScreen,
  screens,
  setRoomId,
  roomId,
  setIsVideoCall, // Etat pour choisir appel vidéo ou audio
}) {
  const [callType, setCallType] = useState(""); // "audio" ou "video"

  // Gère l'appel ou la participation à une réunion
  const onCallOrJoin = (screen) => {
    if (roomId.length > 0) {
      setScreen(screen);
    }
  };

  // Générer un ID de salle aléatoire
  useEffect(() => {
    const generateRandomId = () => {
      const characters = "abcdefghijklmnopqrstuvwxyz";
      let result = "";
      for (let i = 0; i < 7; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters.charAt(randomIndex);
      }
      return setRoomId(result);
    };
    generateRandomId();
  }, []);

  // Vérifie si la salle existe
  const checkMeeting = async () => {
    if (roomId) {
      const roomRef = doc(db, "room", roomId);
      const roomSnapshot = await getDoc(roomRef);

      if (!roomSnapshot.exists() || roomId === "") {
        Alert.alert("Attendez que votre instructeur démarre la réunion.");
        return;
      } else {
        onCallOrJoin(screens.JOIN);
      }
    } else {
      Alert.alert("Veuillez fournir un ID de salle valide.");
    }
  };

  // Fonction pour commencer un appel vidéo ou audio
  const startCall = () => {
    if (callType === "") {
      Alert.alert("Veuillez sélectionner un type d'appel (Audio ou Vidéo).");
      return;
    }
    // On configure si l'appel sera vidéo ou audio
    setIsVideoCall(callType === "video");
    onCallOrJoin(screens.CALL); // Passe à l'écran de l'appel
  };

  return (
    <View>
      <Text className="text-2xl font-bold text-center">Entrez l'ID de la salle :</Text>
      <TextInput
        className="bg-white border-sky-600 border-2 mx-5 my-3 p-2 rounded-md"
        value={roomId}
        onChangeText={setRoomId}
      />

      {/* Choix entre appel audio ou vidéo */}
      <Text className="text-xl text-center mt-5">Sélectionnez le type d'appel :</Text>
      <View className="flex-row justify-center gap-4 mt-2">
        <TouchableOpacity
          className={`p-2 rounded-md ${callType === "audio" ? "bg-blue-300" : "bg-gray-300"}`}
          onPress={() => setCallType("audio")}
        >
          <Text className="text-center text-xl font-bold">Appel Audio</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`p-2 rounded-md ${callType === "video" ? "bg-blue-300" : "bg-gray-300"}`}
          onPress={() => setCallType("video")}
        >
          <Text className="text-center text-xl font-bold">Appel Vidéo</Text>
        </TouchableOpacity>
      </View>

      <View className="gap-y-3 mx-5 mt-5">
        {/* Bouton pour démarrer l'appel */}
        <TouchableOpacity
          className="bg-sky-300 p-2 rounded-md"
          onPress={startCall}
        >
          <Text className="text-black text-center text-xl font-bold">
            Démarrer l'appel
          </Text>
        </TouchableOpacity>

        {/* Bouton pour rejoindre la réunion */}
        <TouchableOpacity
          className="bg-sky-300 p-2 rounded-md"
          onPress={checkMeeting}
        >
          <Text className="text-black text-center text-xl font-bold">
            Rejoindre la réunion
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

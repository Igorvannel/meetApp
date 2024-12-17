import React, { useState, useEffect } from "react";
import { Text, StyleSheet, Button, View, TextInput } from "react-native";

import {
  RTCPeerConnection,
  RTCView,
  mediaDevices,
  RTCIceCandidate,
  RTCSessionDescription,
  MediaStream,
} from "react-native-webrtc";
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
import CallActionBox from "../components/CallActionBox";

// Configuration de la connexion
const configuration = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

export default function CallScreen({ screens, setScreen }) {
  const [localStream, setLocalStream] = useState();
  const [remoteStream, setRemoteStream] = useState();
  const [cachedLocalPC, setCachedLocalPC] = useState();
  const [isMuted, setIsMuted] = useState(false);
  const [isOffCam, setIsOffCam] = useState(false);

  // Nouveaux états pour gérer le numéro à appeler et l'appel en cours
  const [phoneNumber, setPhoneNumber] = useState(""); // Numéro d'appel
  const [isCalling, setIsCalling] = useState(false); // Si l'appel est en cours

  // Automatically start stream
  useEffect(() => {
    startLocalStream();
  }, []);

  // Start the local video stream
  const startLocalStream = async () => {
    const isFront = true; // Front-facing camera
    const devices = await mediaDevices.enumerateDevices();

    const facing = isFront ? "front" : "environment";
    const videoSourceId = devices.find(
      (device) => device.kind === "videoinput" && device.facing === facing
    );
    const facingMode = isFront ? "user" : "environment";
    const constraints = {
      audio: true,
      video: {
        mandatory: {
          minWidth: 500,
          minHeight: 300,
          minFrameRate: 30,
        },
        facingMode,
        optional: videoSourceId ? [{ sourceId: videoSourceId }] : [],
      },
    };
    const newStream = await mediaDevices.getUserMedia(constraints);
    setLocalStream(newStream);
  };

  // Function to start a call with a given phone number (or ID)
  const startCall = async (phoneNumber) => {
    setIsCalling(true); // Indiquer que l'appel a commencé

    // Créez un document pour la salle de l'appel, basé sur le numéro (ou ID)
    const roomRef = doc(db, "rooms", phoneNumber);
    await setDoc(roomRef, { connected: false });

    // Créez la connexion peer
    const localPC = new RTCPeerConnection(configuration);
    localStream.getTracks().forEach((track) => {
      localPC.addTrack(track, localStream);
    });

    const callerCandidatesCollection = collection(roomRef, "callerCandidates");

    localPC.addEventListener("icecandidate", (e) => {
      if (!e.candidate) {
        console.log("Got final candidate!");
        return;
      }
      addDoc(callerCandidatesCollection, e.candidate.toJSON());
    });

    localPC.ontrack = (e) => {
      const newStream = new MediaStream();
      e.streams[0].getTracks().forEach((track) => {
        newStream.addTrack(track);
      });
      setRemoteStream(newStream);
    };

    // Créer une offre pour l'appel
    const offer = await localPC.createOffer();
    await localPC.setLocalDescription(offer);

    // Enregistrer l'offre dans Firebase
    await updateDoc(roomRef, { offer, connected: true });

    // Mise en place des écouteurs pour les candidats ICE
    onSnapshot(callerCandidatesCollection, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          let data = change.doc.data();
          localPC.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });

    setCachedLocalPC(localPC);
  };

  // Fonction pour rejoindre un appel
  const joinCall = async () => {
    const roomRef = doc(db, "rooms", phoneNumber);
    const roomSnapshot = await getDoc(roomRef);

    if (!roomSnapshot.exists) return;

    const localPC = new RTCPeerConnection(configuration);
    localStream.getTracks().forEach((track) => {
      localPC.addTrack(track, localStream);
    });

    const calleeCandidatesCollection = collection(roomRef, "calleeCandidates");

    localPC.addEventListener("icecandidate", (e) => {
      if (!e.candidate) {
        console.log("Got final candidate!");
        return;
      }
      addDoc(calleeCandidatesCollection, e.candidate.toJSON());
    });

    localPC.ontrack = (e) => {
      const newStream = new MediaStream();
      e.streams[0].getTracks().forEach((track) => {
        newStream.addTrack(track);
      });
      setRemoteStream(newStream);
    };

    const offer = roomSnapshot.data().offer;
    await localPC.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await localPC.createAnswer();
    await localPC.setLocalDescription(answer);

    await updateDoc(roomRef, { answer, connected: true });

    const callerCandidatesCollection = collection(roomRef, "callerCandidates");
    onSnapshot(callerCandidatesCollection, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          let data = change.doc.data();
          localPC.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });

    setCachedLocalPC(localPC);
  };

  // Toggle mute
  const toggleMute = () => {
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
    });
  };

  // Toggle camera
  const toggleCamera = () => {
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setIsOffCam(!isOffCam);
    });
  };

  // Switch camera
  const switchCamera = () => {
    localStream.getVideoTracks().forEach((track) => track._switchCamera());
  };

  // End the call
  const endCall = async () => {
    if (cachedLocalPC) {
      const senders = cachedLocalPC.getSenders();
      senders.forEach((sender) => {
        cachedLocalPC.removeTrack(sender);
      });
      cachedLocalPC.close();
    }

    const roomRef = doc(db, "rooms", phoneNumber);
    await updateDoc(roomRef, { answer: deleteField(), connected: false });

    setLocalStream(null);
    setRemoteStream(null); // set remoteStream to null or empty when callee leaves the call
    setCachedLocalPC(null);
    setScreen(screens.ROOM); // go back to room screen
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        placeholder="Enter phone number or ID"
        keyboardType="numeric"
      />
      {!isCalling ? (
        <Button title="Start Call" onPress={() => startCall(phoneNumber)} />
      ) : (
        <Button title="Join Call" onPress={joinCall} />
      )}

      <RTCView
        style={styles.remoteVideo}
        streamURL={remoteStream && remoteStream.toURL()}
        objectFit={"cover"}
      />
      
      {remoteStream && !isOffCam && (
        <RTCView
          style={styles.localVideo}
          streamURL={localStream && localStream.toURL()}
        />
      )}

      <View style={styles.actions}>
        <CallActionBox
          switchCamera={switchCamera}
          toggleMute={toggleMute}
          toggleCamera={toggleCamera}
          endCall={endCall}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    width: "80%",
    padding: 10,
    margin: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
  },
  remoteVideo: {
    width: "100%",
    height: "70%",
  },
  localVideo: {
    width: 120,
    height: 180,
    position: "absolute",
    top: 30,
    right: 20,
  },
  actions: {
    position: "absolute",
    bottom: 30,
    width: "100%",
  },
});

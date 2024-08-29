export interface Sdp {
  sdp: string;
  type: string;
}

export interface OutgoingCallData {
  calleeId: string;
  sdpOffer: Sdp;
}

export interface IncomingCallData {
  callerId: string;
  sdpAnswer: Sdp;
}

export interface IceCandidate {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
}

export interface IceCandidateData {
  calleeId: string;
  iceCandidate: IceCandidate;
}

export interface RoomData {
  socketId: string;
  roomId: string;
  peerId: string;
}
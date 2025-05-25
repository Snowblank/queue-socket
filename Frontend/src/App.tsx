import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Rooms {
  id: string;
  name: string;
  status: string;
  seat: {
    booking: number;
    max: number
  }
}

interface RoomDetail {
  id: string;
  name: string;
  status: string;
  seat: {
    id: string;
    owner: string | null;
  }[];
}

interface ResponseSocket<T = unknown> {
  data: T;
  error: {
    message: string;
  } | null
}

const clientId = localStorage.getItem('clientId') || crypto.randomUUID();
localStorage.setItem('clientId', clientId);
const socket: Socket = io('http://localhost:3000', {
  transports: ['websocket'],
  auth: {
    clientId
  }
});

function App() {
  const [status, setStatus] = useState<'idle' | 'joined' | 'queue' | 'submit' | 'error'>('idle');
  const [position, setPosition] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [seatId, setSeatId] = useState('');
  const [roomList, setRoomList] = useState<Rooms[]>([])
  const [selectRoomId, setSelectRoomId] = useState<string | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<RoomDetail | null>(null)

  const fetchRoomList = async () => {
    fetch('http://localhost:3000/rooms')
      .then(res => res.json())
      .then(data => {
        console.log('roomlist', data)
        setRoomList(data)
      })
      .catch(() => setMessage('❌ Failed to fetch rooms'));
  }

  const fetchTargetRoom = async (roomId: string) => {
    fetch(`http://localhost:3000/rooms/${roomId}`)
      .then(res => res.json())
      .then(data => {
        console.log('targetroom', data)
        setSelectedRoom(data)
      })
      .catch(() => setMessage('❌ Failed to fetch targetRooms'));
    console.log('fetchTargetRoom')
  }

  useEffect(() => {
    fetchRoomList()

    socket.on('connect', () => {
      console.log('socket connect')
    });

    socket.on('connect_error', (err) => {
      setStatus('error');
      setMessage('❌ Connection error: ' + err.message);
    });

    socket.on('disconnect', (reason) => {
      console.warn(`socket disconnected by ${reason}`)
    });

    socket.on('error', (error) => {
      console.error('socket Error:', error.message);
    });

    socket.on('joinedRoom', async ({ roomId }) => {
      await fetchTargetRoom(roomId);
      setStatus('joined');
      setPosition(null);
    });

    socket.on('queueJoined', ({ roomId, position }) => {
      setPosition(position);
      setStatus('queue');
      setMessage(`⏳ In queue for ${roomId}`);
    });

    socket.on('updatePosition', ({ position }) => {
      setPosition(position)
      setStatus('queue');
    });

    return () => {
      socket.off('joinedRoom');
      socket.off('queueJoined');
      socket.off('updatePosition');
    };
  }, []);

  const handleJoin = async (roomId: string) => {
    if (!roomId) return;
    socket.emit('selectRoom', { roomId }, async (response: ResponseSocket<{ queuePosition: number }>) => {
      console.log('response => selectRoom', response)
        if (response.error != null) {
        setMessage(response.error.message);
        socket.emit('leaveRoom', { roomId })
        setStatus('idle');
        return
      }
      
      if (response.data.queuePosition === 0) {
        console.log('fetch targetRoom')
        //popup show waiting queue amount if not show page target room and get seatlist
        await fetchTargetRoom(roomId);
        setStatus('joined');
      } else {
        setStatus('queue');
        setSelectRoomId(roomId);
        setPosition(response.data.queuePosition);
      }
    });
  }

  const handleSubmitSeat = (roomId: string, seatId: string) => {
    if (!seatId) return;
    console.log('click => submitSeat Button')
    socket.emit('submitSeat', { roomId, seatId }, (response: ResponseSocket<{ message: string; roomId: string; seatId: string }>) => {
      if (response.error != null) {
        setMessage(response.error.message);
        socket.emit('leaveRoom', { roomId })
        setStatus('idle');
        return
      }
      console.log('submit seat success', response.data)
      setSeatId(response.data.seatId);
      socket.emit('leaveRoom', { roomId })
      setStatus('submit')
    });
  };

  const handleLeave = (roomId: string) => {
    socket.emit('leaveRoom', { roomId });
    setSelectRoomId(null)
    setStatus('idle');
  };

  return (
    <div style={{ margin: 'auto', padding: '2rem' }}>
      {status === 'idle' && (
        <>
          <h1>🎟️ Please Select Room</h1>
          <div className="grid grid-cols-2 gap-4">
            {roomList.map((room) => (
              <div
                key={room.id}
              >
                <h2 className="font-bold">{room.name}</h2>
                <button
                  className={`px-4 py-2 rounded ${room.status === 'available'
                    ? 'bg-green-500 text-white'
                    : 'bg-red-400 text-white cursor-not-allowed'}`}
                  disabled={room.status !== 'available'}
                  onClick={async () => handleJoin(room.id)}
                >
                  {room.status === 'available'
                    ? `Available (${room.seat.booking}/${room.seat.max})`
                    : `Lock (${room.seat.booking}/${room.seat.max})`}
                </button>
              </div>
            ))}
          </div></>
      )}

      {status === 'joined' && (
        <>
          <h1>🎟️ Room: {selectedRoom?.name}</h1>
          <div className="grid grid-cols-2 gap-4">
            {selectedRoom?.seat.map((seat) =>
            (<div key={seat.id}>
              <h2 className="font-bold">{seat.id}</h2>
              <button
                className={`px-4 py-2 rounded ${seat.owner !== null
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-red-400 text-white cursor-not-allowed'}`}
                disabled={seat.owner !== null}
                onClick={async () => handleSubmitSeat(selectedRoom.id, seat.id)}
              >
                {seat.owner !== null
                  ? seat.owner === clientId ? 'Your Seat' : `Booked`
                  : `Select`}
              </button>
            </div>)
            )}
          </div>
        </>
      )}

      {status === 'submit' && (
        <>
          <h1>🎟️ Done</h1>
          <div key={seatId}>
            <h2 className="font-bold">{seatId}</h2>
            <button
              className={`px-4 py-2 rounded bg-green-500 text-white`}
              onClick={() => {
                setStatus('idle')
                fetchRoomList();
              }}
            >Selected</button>
          </div>
        </>
      )}

      {status === 'queue' && (
        <>
          <h1>⏳ Waiting in Room: {selectRoomId}</h1>
          <p className="mb-4 text-sm text-gray-600">Your current position: {position}</p>
          <button
            className="px-4 py-2 rounded bg-yellow-500 text-white"
            onClick={() => handleLeave(selectRoomId || '')}
          >
            Leave Queue
          </button>
        </>
      )}


      <p style={{ marginTop: '1rem' }}>{message}</p>
    </div>
  );
}

export default App;
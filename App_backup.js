import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, ScrollView, 
  StatusBar, Alert, TextInput, Modal, SafeAreaView, ActivityIndicator, Image, KeyboardAvoidingView, Platform 
} from 'react-native';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  Play, Pause, Square, Plus, Trash2, Repeat, CheckCircle, 
  List, ArrowLeft, Clock, Trophy, Activity, Save, 
  User, Cloud, RefreshCw, LogOut, Mail, Zap, Medal, Crown, Database, SkipForward 
} from 'lucide-react-native';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signOut, 
  GoogleAuthProvider, signInWithCredential 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, onSnapshot, 
  deleteDoc, addDoc, query, orderBy, serverTimestamp 
} from 'firebase/firestore';

// --- CONFIGURAÇÃO FIREBASE (PLACEHOLDERS DE SEGURANÇA) ---
// TODO: Substitua os valores abaixo pelas chaves do seu projeto no Firebase Console
const firebaseConfig = {
  apiKey: "INSIRA_SUA_API_KEY_AQUI",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_PROJETO.firebasestorage.app",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "SEU_APP_ID_ANDROID",
  measurementId: "G-XXXXXXXXXX" // Opcional
};

// Inicialização dos serviços
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ID interno para organização das coleções no Firestore
const internalAppId = 'run-trainer-v1';

// --- UTILITÁRIOS MATEMÁTICOS ---
const formatTime = (s) => {
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${m < 10 ? '0' : ''}${m}:${sec < 10 ? '0' : ''}${sec}`;
};

const flattenWorkout = (structure) => {
  let queue = [];
  if (!structure) return queue;
  structure.forEach(item => {
    if (item.type === 'step') queue.push(item);
    else if (item.type === 'loop') {
      for (let i = 0; i < item.cycles; i++) {
        item.items.forEach(subItem => queue.push(subItem));
      }
    }
  });
  return queue;
};

// --- ARQUIVOS DE ÁUDIO (ASSETS) ---
// Certifique-se de que estes arquivos existem na pasta ./assets do projeto
const SOUND_FILES = {
  countdown: require('./assets/countdown.mp3'),
  warmup: require('./assets/audio_warmup.mp3'),
  run: require('./assets/audio_run.mp3'),
  walk: require('./assets/audio_walk.mp3'),
  cool: require('./assets/audio_cooldown.mp3'),
  finish: require('./assets/audio_finished.mp3'),
};

// --- DEFINIÇÃO DE TEMAS VISUAIS ---
const THEMES = {
  custom: { primary: '#06b6d4', bg: '#164e63', border: '#0891b2', title: 'Personalizado' }, 
  '5k': { primary: '#10b981', bg: '#064e3b', border: '#059669', title: 'Rumo ao 5K' },    
  '10k': { primary: '#8b5cf6', bg: '#4c1d95', border: '#7c3aed', title: 'Rumo ao 10K' },   
  '21k': { primary: '#f59e0b', bg: '#78350f', border: '#d97706', title: 'Meia Maratona' }, 
  '42k': { primary: '#f43f5e', bg: '#881337', border: '#e11d48', title: 'Maratona' },     
  profile: { primary: '#64748b', bg: '#1e293b', border: '#475569', title: 'Meu Perfil' }, 
};

// --- TIPOS DE PASSO (WORKOUT STEPS) ---
const STEP_TYPES = {
  run: { label: 'Correr', color: '#ef4444' },
  walk: { label: 'Caminhar', color: '#3b82f6' },
  warmup: { label: 'Aquecer', color: '#eab308' },
  cool: { label: 'Resfriar', color: '#10b981' }
};

// --- GERADORES DE PROGRAMAS DE TREINO ---

// 1. Programa C25K (9 Semanas)
const generateC25K = () => {
  const w = [];
  for(let i=1; i<=4; i++) {
    for(let d=1; d<=3; d++) {
       let run = 60 + (i*30); 
       let walk = 120 - (i*15);
       w.push({id:`c25k_w${i}_d${d}`, category:'5k', title:`Semana ${i} - Dia ${d}`, description:`Intervalado: Correr ${run}s / Andar ${walk}s`, structure:[{type:'step',name:'Aquecer',duration:300,color:'#eab308'},{type:'loop',cycles:8-i,items:[{type:'step',name:'Correr',duration:run,color:'#ef4444'},{type:'step',name:'Andar',duration:walk,color:'#3b82f6'}]},{type:'step',name:'Resfriar',duration:300,color:'#10b981'}]});
    }
  }
  w.push({id:'c25k_w5_d1', category:'5k', title:'Semana 5 - Dia 1', description:'3x 5min corrida', structure:[{type:'step',name:'Aquecer',duration:300,color:'#eab308'},{type:'loop',cycles:3,items:[{type:'step',name:'Correr',duration:300,color:'#ef4444'},{type:'step',name:'Andar',duration:180,color:'#3b82f6'}]},{type:'step',name:'Resfriar',duration:300,color:'#10b981'}]});
  w.push({id:'c25k_w5_d2', category:'5k', title:'Semana 5 - Dia 2', description:'2x 8min corrida', structure:[{type:'step',name:'Aquecer',duration:300,color:'#eab308'},{type:'loop',cycles:2,items:[{type:'step',name:'Correr',duration:480,color:'#ef4444'},{type:'step',name:'Andar',duration:300,color:'#3b82f6'}]},{type:'step',name:'Resfriar',duration:300,color:'#10b981'}]});
  w.push({id:'c25k_w5_d3', category:'5k', title:'Semana 5 - Dia 3', description:'O Grande Salto: 20min', structure:[{type:'step',name:'Aquecer',duration:300,color:'#eab308'},{type:'step',name:'Correr',duration:1200,color:'#ef4444'},{type:'step',name:'Resfriar',duration:300,color:'#10b981'}]});
  for(let i=6; i<=9; i++) {
      let dur = 1200 + ((i-5)*180); 
      if(i===9) dur = 1800; 
      for(let d=1; d<=3; d++) {
        w.push({id:`c25k_w${i}_d${d}`, category:'5k', title:`Semana ${i} - Dia ${d}`, description:`Corrida Contínua: ${Math.round(dur/60)} min`, structure:[{type:'step',name:'Aquecer',duration:300,color:'#eab308'},{type:'step',name:'Correr',duration:dur,color:'#ef4444'},{type:'step',name:'Resfriar',duration:300,color:'#10b981'}]});
      }
  }
  return w;
};

// 2. Programa Bridge to 10K (6 Semanas)
const generateBridgeTo10K = () => {
    const w = [];
    for(let i=1; i<=6; i++) {
        const dur = 1800 + (i*300); 
        for(let d=1; d<=3; d++) {
            let cycles = Math.max(1, Math.floor(dur / 600)); 
            let runT = Math.floor(dur / cycles);
            w.push({id:`10k_w${i}_d${d}`, category:'10k', title:`Semana ${i} - Dia ${d}`, description:`Volume Total: ${Math.round(dur/60)}min`, structure:[{type:'step',name:'Aquecer',duration:300,color:'#eab308'},{type:'loop',cycles:cycles,items:[{type:'step',name:'Correr',duration:runT,color:'#8b5cf6'},{type:'step',name:'Andar',duration:60,color:'#3b82f6'}]},{type:'step',name:'Resfriar',duration:300,color:'#10b981'}]});
        }
    }
    return w;
};

// 3. Programa Meia Maratona (10 Semanas)
const generateHalfMarathon = () => {
    const w = [];
    for(let i=1; i<=10; i++) {
        w.push({id:`21k_w${i}_d1`, category:'21k', title:`Semana ${i} - Recuperação`, description:'Rodagem leve', structure:[{type:'step',name:'Aquecer',duration:300,color:'#eab308'},{type:'step',name:'Rodagem',duration:2400+(i*60),color:'#3b82f6'},{type:'step',name:'Resfriar',duration:300,color:'#10b981'}]});
        w.push({id:`21k_w${i}_d2`, category:'21k', title:`Semana ${i} - Ritmo`, description:'Tempo Run', structure:[{type:'step',name:'Aquecer',duration:600,color:'#eab308'},{type:'step',name:'Ritmo',duration:1200+(i*120),color:'#f59e0b'},{type:'step',name:'Resfriar',duration:600,color:'#10b981'}]});
        let longD = i===10 ? 7800 : 3600+(i*600);
        w.push({id:`21k_w${i}_d3`, category:'21k', title:`Semana ${i} - Longão`, description: i===10 ? 'A PROVA' : 'Volume alto', structure:[{type:'step',name:'Aquecer',duration:300,color:'#eab308'},{type:'step',name:'Longo',duration:longD,color:'#f59e0b'},{type:'step',name:'Resfriar',duration:300,color:'#10b981'}]});
    }
    return w;
};

// 4. Programa Maratona (16 Semanas)
const generateMarathon = () => {
    const w = [];
    for(let i=1; i<=16; i++) {
        let longD = 5400 + (i*600);
        if(i>13) longD = 5400; 
        if(i===16) longD = 14400; 
        w.push({id:`42k_w${i}_d3`, category:'42k', title:`Semana ${i} - Longão`, description:'Foco em distância', structure:[{type:'step',name:'Aquecer',duration:600,color:'#eab308'},{type:'step',name:'Longo',duration:longD,color:'#f43f5e'},{type:'step',name:'Resfriar',duration:600,color:'#10b981'}]});
    }
    return w;
};

const STATIC_WORKOUTS = [...generateC25K(), ...generateBridgeTo10K(), ...generateHalfMarathon(), ...generateMarathon()];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home'); 
  const [activeTab, setActiveTab] = useState('custom'); 
  
  // ESTADOS GLOBAIS
  const [user, setUser] = useState(null);
  const [customWorkouts, setCustomWorkouts] = useState([]);
  const [completedWorkouts, setCompletedWorkouts] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // ESTADOS DO RUNNER (Cronômetro)
  const [executionQueue, setExecutionQueue] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [workoutCompleted, setWorkoutCompleted] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [countdown, setCountdown] = useState(null); 
  const [sound, setSound] = useState(); 

  // ESTADOS DO CRIADOR (Custom)
  const [newWorkout, setNewWorkout] = useState({ title: '', description: '', structure: [] });
  const [selectedStepType, setSelectedStepType] = useState('run');
  const [stepDurationMin, setStepDurationMin] = useState('5');
  const [stepDurationSec, setStepDurationSec] = useState('00');
  
  const timerRef = useRef(null);
  const currentTheme = THEMES[activeTab] || THEMES.custom;
  
  const workouts = useMemo(() => [...customWorkouts, ...STATIC_WORKOUTS], [customWorkouts]);

  // MENU DE NAVEGAÇÃO
  const tabs = [
    { id: 'custom', label: 'Personalizado', icon: <Plus size={20} color={activeTab==='custom'?'#FFF':'#94a3b8'}/> },
    { id: '5k', label: 'Rumo ao 5K', icon: <Zap size={20} color={activeTab==='5k'?'#FFF':'#94a3b8'}/> },
    { id: '10k', label: 'Rumo ao 10K', icon: <Activity size={20} color={activeTab==='10k'?'#FFF':'#94a3b8'}/> },
    { id: '21k', label: 'Meia Maratona', icon: <Medal size={20} color={activeTab==='21k'?'#FFF':'#94a3b8'}/> },
    { id: '42k', label: 'Maratona', icon: <Crown size={20} color={activeTab==='42k'?'#FFF':'#94a3b8'}/> },
    { id: 'profile', label: 'Perfil', icon: <User size={20} color={activeTab==='profile'?'#FFF':'#94a3b8'}/> },
  ];

  // --- AUTENTICAÇÃO E SINCRONIZAÇÃO ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      if(!u) signInAnonymously(auth); // Fallback para modo anônimo
    });
    return unsub;
  }, []);

  // Monitora mudanças no Firebase e sincroniza com o estado local
  useEffect(() => {
    if(!user) return;
    const q = query(collection(db, 'artifacts', internalAppId, 'users', user.uid, 'custom_workouts'), orderBy('createdAt', 'desc'));
    const unsubW = onSnapshot(q, s => setCustomWorkouts(s.docs.map(d=>({id:d.id, ...d.data()}))));
    const unsubP = onSnapshot(doc(db, 'artifacts', internalAppId, 'users', user.uid, 'data', 'profile'), s => {
      if(s.exists()) setCompletedWorkouts(s.data().completed || []);
    });
    return () => { unsubW(); unsubP(); };
  }, [user]);

  // --- GERENCIAMENTO DE ÁUDIO ---
  async function playSmartSound(soundType) {
    try {
      if (sound) await sound.unloadAsync();
      let source;
      switch (soundType) {
        case 'countdown': source = SOUND_FILES.countdown; break;
        case 'run': source = SOUND_FILES.run; break;
        case 'walk': source = SOUND_FILES.walk; break;
        case 'warmup': source = SOUND_FILES.warmup; break;
        case 'cool': source = SOUND_FILES.cool; break;
        case 'finish': source = SOUND_FILES.finish; break;
        default: return;
      }
      const { sound: newSound } = await Audio.Sound.createAsync(source);
      setSound(newSound);
      await newSound.playAsync();
    } catch (error) { console.log("Erro ao reproduzir áudio:", error); }
  }

  const playStepSound = (stepName) => {
    const name = stepName.toLowerCase();
    if (name.includes('aquec')) playSmartSound('warmup');
    else if (name.includes('correr') || name.includes('tiro') || name.includes('ritmo') || name.includes('longo') || name.includes('rodagem')) playSmartSound('run');
    else if (name.includes('caminhar') || name.includes('andar') || name.includes('recup')) playSmartSound('walk');
    else if (name.includes('resfriar')) playSmartSound('cool');
  };

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  // --- TTS FALLBACK ---
  const speak = (t) => Speech.speak(t, { language: 'pt-BR' });

  // --- LÓGICA DO CRONÔMETRO ---
  useEffect(() => {
    if(isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(p=>p-1), 1000);
    } else if (timeLeft === 0 && isRunning) {
      handleNextStep();
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, timeLeft]);

  const handleNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < executionQueue.length) {
      setCurrentStepIndex(nextIndex);
      setTimeLeft(executionQueue[nextIndex].duration);
      playStepSound(executionQueue[nextIndex].name);
    } else {
      finishWorkout();
    }
  };

  // --- LÓGICA DE CONTAGEM REGRESSIVA (COM DELAY) ---
  useEffect(() => {
    if (currentScreen === 'countdown' && countdown !== null) {
      if (countdown === 3) playSmartSound('countdown'); 

      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        // DELAY DE 1.5s ANTES DE INICIAR O TREINO
        const startDelay = setTimeout(() => {
           setCurrentScreen('runner');
           setIsRunning(true);
           if(executionQueue.length > 0) playStepSound(executionQueue[0].name);
        }, 1500);
        return () => clearTimeout(startDelay);
      }
    }
  }, [countdown, currentScreen]);

  // --- AÇÕES DO USUÁRIO ---
  const handleWorkoutSelect = (workout) => {
    setSelectedWorkout(workout);
    setCurrentScreen('preview');
  };

  const startWorkout = () => {
    if (!selectedWorkout) return;
    const q = flattenWorkout(selectedWorkout.structure);
    if (q.length === 0) return Alert.alert("Erro", "Vazio");
    
    setExecutionQueue(q);
    setCurrentStepIndex(0);
    setTimeLeft(q[0].duration);
    setWorkoutCompleted(false);
    
    setCountdown(3); 
    setCurrentScreen('countdown');
  };

  const finishWorkout = async () => {
    setIsRunning(false);
    setWorkoutCompleted(true);
    playSmartSound('finish');
    if (user && !completedWorkouts.includes(selectedWorkout.id)) {
        const newCompleted = [...completedWorkouts, selectedWorkout.id];
        setCompletedWorkouts(newCompleted);
        // Backup na nuvem
        try {
            await setDoc(doc(db, 'artifacts', internalAppId, 'users', user.uid, 'data', 'profile'), { completed: newCompleted }, { merge: true });
        } catch(e) { console.error("Falha backup", e); }
    }
  };

  const saveCustom = async () => {
    if(!newWorkout.title) return Alert.alert("Erro", "Nome obrigatório");
    setIsSyncing(true);
    try {
      await addDoc(collection(db, 'artifacts', internalAppId, 'users', user.uid, 'custom_workouts'), {
        ...newWorkout, category: 'custom', createdAt: serverTimestamp()
      });
      setIsSyncing(false);
      setNewWorkout({title:'', description:'', structure:[]});
      setCurrentScreen('home');
    } catch(e) {
      setIsSyncing(false);
      Alert.alert("Erro", "Falha ao salvar. Verifique conexão.");
    }
  };

  const deleteWorkout = (id) => {
    Alert.alert("Excluir", "Apagar este treino permanentemente?", [
      { text: "Cancelar" },
      { text: "Sim", onPress: async () => {
          if(user) await deleteDoc(doc(db, 'artifacts', internalAppId, 'users', user.uid, 'custom_workouts', id));
      }}
    ]);
  };

  const addStepToCustom = () => {
    const min = parseInt(stepDurationMin) || 0;
    const sec = parseInt(stepDurationSec) || 0;
    const totalSeconds = (min * 60) + sec;
    if (totalSeconds <= 0) { Alert.alert("Erro", "Duração inválida."); return; }
    const typeConfig = STEP_TYPES[selectedStepType];
    setNewWorkout(prev => ({
      ...prev,
      structure: [...prev.structure, { type: 'step', name: typeConfig.label, duration: totalSeconds, color: typeConfig.color }]
    }));
  };

  // --- COMPONENTES DE RENDERIZAÇÃO ---
  
  if (currentScreen === 'countdown') {
    return (
      <SafeAreaView style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}>
        <StatusBar hidden />
        <Text style={{color: '#94a3b8', fontSize: 20, marginBottom: 20, fontWeight: 'bold', letterSpacing: 2}}>PREPARE-SE</Text>
        <Text style={{fontSize: 120, fontWeight: '900', color: '#eab308'}}>{countdown > 0 ? countdown : 'GO!'}</Text>
      </SafeAreaView>
    );
  }

  if (currentScreen === 'runner') {
    const step = executionQueue[currentStepIndex];
    const nextStep = executionQueue[currentStepIndex + 1];
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: workoutCompleted ? '#0f172a' : '#1e293b'}]}>
        <StatusBar hidden />
        {workoutCompleted ? (
          <View style={styles.center}>
            <Trophy size={80} color="#eab308"/>
            <Text style={styles.title}>Vitória!</Text>
            <TouchableOpacity onPress={()=>setCurrentScreen('home')} style={styles.btn}><Text>Voltar</Text></TouchableOpacity>
          </View>
        ) : (
          <View style={styles.center}>
            <Text style={{color:'#94a3b8', marginBottom:10}}>A SEGUIR: {nextStep ? nextStep.name : 'FIM'}</Text>
            <Text style={styles.timer}>{formatTime(timeLeft)}</Text>
            <Text style={styles.subTitle}>{step?.name}</Text>
            <View style={styles.row}>
               <TouchableOpacity onPress={()=>{setIsRunning(false); setCurrentScreen('home')}} style={styles.controlBtnSmall}>
                 <Square size={24} color="#FFF" fill="#FFF"/>
               </TouchableOpacity>
               <TouchableOpacity onPress={()=>setIsRunning(!isRunning)} style={styles.controlBtnLarge}>
                 {isRunning ? <Pause size={50} color="#000" fill="#000"/> : <Play size={50} color="#000" fill="#000"/>}
               </TouchableOpacity>
               <TouchableOpacity onPress={handleNextStep} style={styles.controlBtnSmall}>
                  <SkipForward size={28} color="#FFF" fill="#FFF"/>
                  <Text style={{color:'#FFF', fontSize:10, fontWeight:'bold', marginTop:2}}>PULAR</Text>
               </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    );
  }

  if (currentScreen === 'preview' && selectedWorkout) {
    const isDone = completedWorkouts.includes(selectedWorkout.id);
    return (
      <SafeAreaView style={styles.container}>
         <View style={styles.header}>
            <TouchableOpacity onPress={() => setCurrentScreen('home')}><ArrowLeft size={24} color="#FFF"/></TouchableOpacity>
            <Text style={styles.title}>Detalhes</Text>
            <View style={{width:24}}/>
         </View>
         <ScrollView style={styles.content}>
            <Text style={{color: currentTheme.primary, fontSize:12, fontWeight:'bold', marginBottom:5}}>{selectedWorkout.category.toUpperCase()}</Text>
            <Text style={{color:'#FFF', fontSize:28, fontWeight:'bold', marginBottom:10}}>{selectedWorkout.title}</Text>
            <Text style={{color:'#94a3b8', fontSize:16, marginBottom:20}}>{selectedWorkout.description}</Text>
            
            <TouchableOpacity onPress={startWorkout} style={[styles.btn, {backgroundColor: isDone ? '#334155' : '#10b981', marginBottom:30}]}>
                <Play size={20} color="#FFF" fill="#FFF"/>
                <Text style={{color:'#FFF', fontWeight:'bold', fontSize:18}}>{isDone ? 'Refazer' : 'COMEÇAR TREINO'}</Text>
            </TouchableOpacity>

            <Text style={{color:'#94a3b8', fontSize:12, fontWeight:'bold', marginBottom:10}}>ESTRUTURA</Text>
            {selectedWorkout.structure.map((item, idx) => (
                <View key={idx} style={{marginBottom:10, backgroundColor:'#1e293b', padding:15, borderRadius:10, borderLeftWidth:4, borderLeftColor: item.color || '#FFF'}}>
                    <Text style={{color:'#FFF', fontWeight:'bold', fontSize:16}}>{item.type === 'step' ? item.name : `Série (${item.cycles}x)`}</Text>
                    {item.type === 'step' && <Text style={{color:'#94a3b8'}}>{formatTime(item.duration)}</Text>}
                    {item.type === 'loop' && (
                        <View style={{marginTop:5, paddingLeft:10, borderLeftWidth:1, borderLeftColor:'#334155'}}>
                            {item.items.map((sub, sIdx) => (
                                <Text key={sIdx} style={{color:'#94a3b8', fontSize:12}}>• {sub.name} ({formatTime(sub.duration)})</Text>
                            ))}
                        </View>
                    )}
                </View>
            ))}
         </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content"/>
      <View style={[styles.header, { borderBottomColor: currentTheme.primary, borderBottomWidth:1 }]}>
        <View>
            <Text style={[styles.title, {color: currentTheme.primary}]}>RunTrainer</Text>
            <Text style={{color:'#64748b', fontSize:10, textTransform:'uppercase'}}>Offline Pro</Text>
        </View>
        <View style={{backgroundColor: currentTheme.bg, paddingHorizontal:10, paddingVertical:5, borderRadius:20}}>
            <Text style={{color: currentTheme.primary, fontWeight:'bold', fontSize:12}}>{currentTheme.title}</Text>
        </View>
      </View>
      
      <View style={styles.tabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 10, paddingHorizontal:10}}>
          {tabs.map(t => {
            const isActive = activeTab === t.id;
            const theme = THEMES[t.id] || THEMES.custom;
            return (
              <TouchableOpacity key={t.id} onPress={()=>setActiveTab(t.id)} 
                style={[styles.tab, isActive ? {backgroundColor: theme.bg, borderColor: theme.primary} : {borderColor:'#334155'}]}>
                {t.icon}
                <Text style={{color: isActive ? theme.primary : '#94a3b8', fontWeight:'bold', marginLeft:5}}>{t.label}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {activeTab === 'profile' ? (
        <View style={styles.center}>
           <View style={{padding:20, borderRadius:50, backgroundColor:currentTheme.bg, marginBottom:20}}>
             <User size={60} color={currentTheme.primary}/>
           </View>
           <Text style={styles.subTitle}>Perfil</Text>
           <Text style={{color:'#64748b', marginBottom:30, textAlign:'center', paddingHorizontal:20}}>
             ID: {user?.uid?.slice(0,8)}...
           </Text>
           <View style={{flexDirection:'row', gap:20, marginBottom:30}}>
              <View style={styles.statBox}><Text style={styles.statVal}>{completedWorkouts.length}</Text><Text style={styles.statLbl}>Treinos</Text></View>
              <View style={styles.statBox}><Text style={styles.statVal}>{customWorkouts.length}</Text><Text style={styles.statLbl}>Criados</Text></View>
           </View>
           <View style={{flexDirection:'row', alignItems:'center', gap:10, opacity:0.5}}>
             <Database size={16} color="#64748b"/>
             <Text style={{color:'#64748b'}}>Sincronização Automática</Text>
           </View>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {activeTab === 'custom' && (
            <TouchableOpacity onPress={()=>setCurrentScreen('creator')} style={[styles.card, {borderStyle:'dashed', borderColor: currentTheme.primary, alignItems:'center'}]}>
               <Plus size={24} color={currentTheme.primary} />
               <Text style={{color: currentTheme.primary, fontWeight:'bold', marginTop:5}}>Criar Novo Treino</Text>
            </TouchableOpacity>
          )}
          
          {workouts.filter(w=>w.category===activeTab).map(w => {
            const isDone = completedWorkouts.includes(w.id);
            return (
                <TouchableOpacity key={w.id} onPress={()=>handleWorkoutSelect(w)} style={[styles.card, {borderLeftColor: isDone ? '#10b981' : currentTheme.primary, opacity: isDone ? 0.6 : 1}]}>
                <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                    <Text style={[styles.cardTitle, isDone && {textDecorationLine:'line-through', color:'#64748b'}]}>{w.title}</Text>
                    {isDone && <CheckCircle size={20} color="#10b981"/>}
                    {w.category === 'custom' && !isDone && <TouchableOpacity onPress={(e) => { e.stopPropagation(); deleteWorkout(w.id); }}><Trash2 size={18} color="#ef4444"/></TouchableOpacity>}
                </View>
                <Text style={styles.cardDesc}>{w.description}</Text>
                <View style={{marginTop:10, flexDirection:'row', alignItems:'center'}}>
                    <Text style={{color:'#64748b', fontSize:10, fontWeight:'bold'}}>{w.structure.length} BLOCOS</Text>
                </View>
                </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}

      {/* Modal Creator */}
      <Modal visible={currentScreen==='creator'} animationType="slide">
        <SafeAreaView style={styles.container}>
           <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex:1}}>
           <View style={styles.header}>
             <TouchableOpacity onPress={()=>setCurrentScreen('home')}><ArrowLeft color="#FFF"/></TouchableOpacity>
             <Text style={styles.title}>Novo Treino</Text>
             <View style={{width:24}}/>
           </View>
           <ScrollView style={styles.content}>
             <TextInput style={styles.input} placeholder="Nome do Treino" placeholderTextColor="#64748b" value={newWorkout.title} onChangeText={t=>setNewWorkout({...newWorkout, title:t})}/>
             <TextInput style={[styles.input, {fontSize:14}]} placeholder="Descrição (opcional)" placeholderTextColor="#64748b" value={newWorkout.description} onChangeText={t=>setNewWorkout({...newWorkout, description:t})}/>
             
             <Text style={{color:'#64748b', fontSize:12, fontWeight:'bold', marginBottom:10, marginTop:10}}>ADICIONAR ETAPAS</Text>
             
             <View style={styles.controlPanel}>
                <View style={{flexDirection:'row', gap:5, marginBottom:15}}>
                  {Object.entries(STEP_TYPES).map(([key, config]) => (
                    <TouchableOpacity 
                      key={key} 
                      onPress={() => setSelectedStepType(key)}
                      style={[styles.typeBtn, selectedStepType===key && {backgroundColor: config.color, borderColor: config.color}]}
                    >
                      <Text style={[styles.typeBtnText, selectedStepType===key && {color:'#FFF'}]}>{config.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={{flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:15}}>
                   <Text style={{color:'#FFF', fontWeight:'bold'}}>Duração:</Text>
                   <View style={{flexDirection:'row', alignItems:'center', gap:5}}>
                      <TextInput 
                        style={styles.timeInput} 
                        keyboardType="numeric" 
                        value={stepDurationMin}
                        onChangeText={setStepDurationMin}
                        placeholder="00"
                        placeholderTextColor="#64748b"
                      />
                      <Text style={{color:'#64748b'}}>min</Text>
                      <TextInput 
                        style={styles.timeInput} 
                        keyboardType="numeric" 
                        value={stepDurationSec}
                        onChangeText={setStepDurationSec}
                        placeholder="00"
                        placeholderTextColor="#64748b"
                      />
                      <Text style={{color:'#64748b'}}>s</Text>
                   </View>
                </View>

                <TouchableOpacity onPress={addStepToCustom} style={[styles.btn, {backgroundColor: STEP_TYPES[selectedStepType].color}]}>
                   <Text style={{fontWeight:'bold', color:'#FFF'}}>+ ADICIONAR PASSO</Text>
                </TouchableOpacity>
             </View>

             <View style={{marginTop:20}}>
                {newWorkout.structure.map((item, idx) => (
                    <View key={idx} style={[styles.blockItem, {borderLeftColor: item.color, borderLeftWidth:4}]}>
                        <Text style={{color:'#FFF', fontWeight:'bold'}}>{item.name}</Text>
                        <View style={{flexDirection:'row', alignItems:'center', gap:10}}>
                            <Text style={{color:'#94a3b8'}}>{formatTime(item.duration)}</Text>
                            <TouchableOpacity onPress={() => {const s=[...newWorkout.structure]; s.splice(idx,1); setNewWorkout({...newWorkout, structure:s})}}>
                                <Trash2 size={18} color="#ef4444"/>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
             </View>

             <TouchableOpacity onPress={saveCustom} style={[styles.btn, {backgroundColor:'#10b981', marginTop:40, marginBottom:40}]}>
               {isSaving ? <ActivityIndicator color="#FFF"/> : <Text style={{fontWeight:'bold', fontSize:18}}>SALVAR TREINO</Text>}
             </TouchableOpacity>
           </ScrollView>
           </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { padding: 20, backgroundColor: '#1e293b', flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingTop: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  tabs: { height: 60, marginTop: 10 },
  tab: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical:8, borderRadius: 20, borderWidth: 1, borderColor: '#334155', backgroundColor: '#1e293b', alignItems:'center', justifyContent:'center' },
  content: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#1e293b', padding: 20, borderRadius: 12, marginBottom: 10, borderLeftWidth: 4, borderColor: '#334155' },
  cardTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  cardDesc: { color: '#94a3b8', marginTop: 5 },
  timer: { fontSize: 90, color: '#FFF', fontWeight: '900', fontVariant: ['tabular-nums'] },
  subTitle: { fontSize: 24, color: '#FFF', marginVertical: 10, fontWeight:'bold' },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 30, width: '100%', justifyContent:'space-around' },
  btn: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, alignItems: 'center', width:'100%', flexDirection:'row', justifyContent:'center', gap:10 },
  miniBtn: { flex:1, padding: 15, borderRadius: 10, alignItems: 'center' },
  input: { backgroundColor: '#1e293b', color: '#FFF', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 18 },
  statBox: { backgroundColor:'#1e293b', padding:15, borderRadius:10, alignItems:'center', minWidth:100 },
  statVal: { color:'#FFF', fontSize:24, fontWeight:'bold' },
  statLbl: { color:'#64748b', fontSize:10, textTransform:'uppercase' },
  blockItem: { flexDirection:'row', justifyContent:'space-between', padding:15, borderRadius:8, marginBottom:8, backgroundColor:'#1e293b', alignItems:'center' },
  controlPanel: { backgroundColor: '#1e293b', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  typeBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  typeBtnText: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  timeInput: { backgroundColor: '#0f172a', color: '#FFF', width: 50, padding: 10, borderRadius: 8, textAlign: 'center', fontWeight: 'bold' },
  
  // Botões de Controle (Runner)
  controlBtnLarge: { width: 100, height: 100, backgroundColor: '#FFF', borderRadius: 50, justifyContent:'center', alignItems:'center', elevation: 10 },
  controlBtnSmall: { width: 60, height: 60, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 30, justifyContent:'center', alignItems:'center' }
});
// Downsample a shared microphone to 16 kHz, mono, signed 16-bit PCM.
class CopilotPCMProcessor extends AudioWorkletProcessor {
 constructor(){super();this.pending=[];this.phase=0;this.sum=0;this.count=0;}
 process(inputs){const channel=inputs[0]?.[0];if(!channel)return true;const ratio=sampleRate/16000;for(const sample of channel){this.sum+=sample;this.count++;this.phase++;if(this.phase>=ratio){this.phase-=ratio;const value=Math.max(-1,Math.min(1,this.sum/this.count));this.pending.push(Math.round(value*(value<0?32768:32767)));this.sum=0;this.count=0;if(this.pending.length>=1600){const pcm=new Int16Array(this.pending);this.port.postMessage(pcm.buffer,[pcm.buffer]);this.pending=[];}}}return true;}
}
registerProcessor('copilot-pcm',CopilotPCMProcessor);

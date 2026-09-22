'use client'
import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'
export default function QRCodeDownload({value}:{value:string}){const canvas=useRef<HTMLCanvasElement>(null);useEffect(()=>{if(canvas.current)QRCode.toCanvas(canvas.current,value,{width:240,margin:2})},[value]);function download(){const a=document.createElement('a');a.download=`${value}.png`;a.href=canvas.current?.toDataURL('image/png')||'';a.click()}return <div className="space-y-2"><canvas ref={canvas} className="rounded border bg-white p-2"/><button onClick={download} className="block rounded bg-slate-900 px-3 py-2 text-sm text-white">Download PNG</button></div>}

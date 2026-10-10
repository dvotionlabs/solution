import type {Metadata} from 'next';
import Portal from '@/components/portal/Portal';
import './portal.css';
export const metadata:Metadata={title:'Athlete portal',robots:{index:false,follow:false}};
export default function AthletePortal(){return <Portal/>;}

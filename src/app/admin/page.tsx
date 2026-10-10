import type {Metadata} from 'next';
import Portal from '@/components/portal/Portal';
import '../portal/portal.css';
export const metadata:Metadata={title:'Coach workspace',robots:{index:false,follow:false}};
export default function AdminPortal(){return <Portal admin/>;}

import {afterEach,expect,it,vi} from 'vitest';
import {z} from 'zod';
import {request} from './api';
afterEach(()=>vi.unstubAllGlobals());
it('shows the sanitized backend quota message',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:429,json:async()=>({detail:'Limite Groq atteinte. Réessayez plus tard.'})}));
 await expect(request('/test',z.object({}))).rejects.toThrow('Limite Groq atteinte');
});
it('does not show oversized service error bodies',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:503,json:async()=>({detail:'x'.repeat(2000)})}));
 await expect(request('/test',z.object({}))).rejects.toThrow('Le service est indisponible');
});

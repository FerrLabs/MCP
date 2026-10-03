import { z } from 'zod';

export const domain = z.string().min(1).max(253).describe('Domain name, e.g. example.com');

export const publicUrl = z.string().min(1).max(2048).describe('Public http(s) URL to check');

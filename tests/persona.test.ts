import request from 'supertest';
import app from '../src/server';

describe('DELETE /api/v1/personas/ng-super-detail-admin', () => {
    it('should delete the persona and return 204', async () => {
        const response = await request(app)
            .delete('/api/v1/personas/ng-super-detail-admin')
            .send({ personaId: 'ng-super-detail-admin' });
        expect(response.status).toBe(204);
    });

    it('should return 404 if persona not found', async () => {
        const response = await request(app)
            .delete('/api/v1/personas/ng-super-detail-admin')
            .send({ personaId: 'non-existent-persona' });
        expect(response.status).toBe(404);
    });
});
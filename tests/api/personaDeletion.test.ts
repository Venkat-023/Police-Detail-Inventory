// Unit tests for the Delete Persona API

import request from 'supertest';
import app from '../src/server';

describe('DELETE /api/v1/personas/ng-super-detail-admin', () => {
    it('should delete the persona successfully', async () => {
        const response = await request(app)
            .delete('/api/v1/personas/ng-super-detail-admin')
            .send({ personaId: 'ng-super-detail-admin' });
        expect(response.status).toBe(204);
    });

    it('should return 404 if persona does not exist', async () => {
        const response = await request(app)
            .delete('/api/v1/personas/non-existent-persona')
            .send({ personaId: 'non-existent-persona' });
        expect(response.status).toBe(404);
    });

    it('should return 500 on internal server error', async () => {
        // Simulate server error
        jest.spyOn(SomeModel, 'deleteOne').mockImplementationOnce(() => { throw new Error('Database error'); });
        const response = await request(app)
            .delete('/api/v1/personas/ng-super-detail-admin')
            .send({ personaId: 'ng-super-detail-admin' });
        expect(response.status).toBe(500);
    });
});
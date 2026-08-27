import request from 'supertest';
import app from '../src/server';

describe('DELETE /api/v1/personas/ng-super-detail-admin', () => {
    it('should delete the persona successfully', async () => {
        const response = await request(app)
            .delete('/api/v1/personas/ng-super-detail-admin')
            .send({ personaId: 'ng-super-detail-admin' });
        expect(response.status).toBe(204);
    });

    it('should return 404 if persona not found', async () => {
        const response = await request(app)
            .delete('/api/v1/personas/ng-super-detail-admin')
            .send({ personaId: 'non-existent-id' });
        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Persona not found.');
    });

    it('should return 500 on server error', async () => {
        // Simulate server error by mocking the model method
        jest.spyOn(Persona, 'findOneAndDelete').mockImplementationOnce(() => { throw new Error('Server error'); });
        const response = await request(app)
            .delete('/api/v1/personas/ng-super-detail-admin')
            .send({ personaId: 'ng-super-detail-admin' });
        expect(response.status).toBe(500);
        expect(response.body.error).toBe('Internal server error.');
    });
});
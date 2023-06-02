import { inject, injectable } from 'tsyringe';
import { sign, verify } from 'jsonwebtoken';

import { IUsersTokensRepository } from '@modules/accounts/repositories/IUsersTokensRepository';
import { IDateProvider } from '@shared/container/providers/DateProvider/IDateProvider';

import auth from '@config/auth';

import { AppError } from '@shared/infra/http/errors/AppError';

interface IPayload {
    sub: string;
    email: string;
}

@injectable()
class RefreshTokenUseCase {
    constructor(
        @inject('UsersTokensRepository')
        private usersTokensRepository: IUsersTokensRepository,

        @inject('DayjsDateProvider')
        private dateProvider: IDateProvider
    ) {}

    async execute(token: string): Promise<string> {
        const { sub, email } = verify(token, auth.secret_refresh_token) as IPayload;

        const user_id = sub;

        const userToken = await this.usersTokensRepository.findByUserIdAndRefreshToken(user_id, token);

        if (!userToken) {
            throw new AppError('Refresh token does not exist');
        }

        await this.usersTokensRepository.deleteById(userToken.id);

        const refreshToken = sign({ email }, auth.secret_refresh_token, {
            subject: sub,
            expiresIn: auth.expires_in_refresh_token,
        });

        const expires_date = this.dateProvider.addDays(auth.expires_in_refresh_token_days);

        await this.usersTokensRepository.create({
            expires_date,
            refresh_token: refreshToken,
            user_id,
        });

        return refreshToken;
    }
}

export { RefreshTokenUseCase };

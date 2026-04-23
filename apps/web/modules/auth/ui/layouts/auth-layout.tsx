export const AuthLayout = ({children }: {children: React.ReactNode}) => {
    return (
        <div className="flex min-h-svh w-full flex-col items-center justify-center px-4">
            {children}
        </div>
    );
}


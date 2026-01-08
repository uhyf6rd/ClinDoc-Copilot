import numpy as np
import openai
import traceback
import time
import json
import re


DEBUG = False

openai.api_key = "sk-..." 
openai.api_base = "..."

openai.proxy = {
    "http": None,
    "https": None
}


class GetOpenAI:
    @staticmethod
    def __gpt_api_stream(messages: list, model='gpt-4'):
        completion = {'role': '', 'content': ''}
        try:
            response = openai.ChatCompletion.create(
                model=model,
                messages=messages,
                stream=False,
            )

            msg = response.choices[0].message.content
            return (True, msg)
        except Exception as err:
            if DEBUG:
                print(f"{traceback.format_exc()}")
            return (False, f'OpenAI API 异常: {err} {completion}')

    def get_respons(self, input_msg, model="gpt-3.5-turbo"):
        assert model in ["gpt-3.5-turbo", 'gpt-4', "gpt-4-turbo-2024-04-09", "gpt-4o-2024-05-13", 'gpt-4o-2024-11-20', 'gpt-4o', 'gpt-4o-2024-08-06']
        messages = [{"role": "system", "content": "You are a helpful assistant."},
                    {'role': 'user', 'content': input_msg}]
        for _ in range(3):
            ret, out_msg = self.__gpt_api_stream(messages, model=model)
            if ret:
                break
            else:
                time.sleep(1)

        return ret, out_msg
